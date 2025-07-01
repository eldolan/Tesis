import pandas as pd
import numpy as np
import joblib
from tensorflow.keras.models import load_model
import warnings

warnings.filterwarnings("ignore")

# Recordatorio: Aprovechar Jupyter para hacer el modelo interactivo y hacer pruebas más rapido.

# =============================================================================
# 1. CARGA DE RECURSOS
# =============================================================================

try:
    modelo = load_model("clasificador_cultivos.keras")
    escalador = joblib.load("escalador_caracteristicas.pkl")
    coder_etiquetas = joblib.load("coder_etiquetas.pkl")
    df_promedios = pd.read_csv("Crop_Recommendation.csv")
    promedios_nutrientes = df_promedios.groupby("Crop")[["Nitrogen", "Phosphorus", "Potassium"]].mean().to_dict("index")

except FileNotFoundError as e:
    print(f"Error: No se encontró el archivo {e.filename}.")
    print("Por favor, ejecutar primero main.py para generar todos los archivos necesarios.")
    exit()
except Exception as e:
    print(f"Ocurrió un error al cargar los recursos: {e}")
    exit()

# =============================================================================
# 2. RECOMENDACIÓN
# =============================================================================

fertilizantes_sugeridos = {
    "alto_N": "Fertilizantes ricos en Nitrógeno como Urea (46-0-0).",
    "alto_P": "Fertilizantes ricos en Fósforo como Superfosfato Triple (0-46-0).",
    "alto_K": "Fertilizantes ricos en Potasio como Cloruro de Potasio (0-0-60).",
    "alto_NP": "Fertilizantes con Nitrógeno y Fósforo como Fosfato Diamónico (DAP) (18-46-0).",
    "alto_NK": "Fertilizantes con Nitrógeno y Potasio como Nitrato de Potasio (13-0-44).",
    "alto_PK": "Fertilizantes con Fósforo y Potasio como Fosfato Monopotásico (0-52-34).",
    "balanceado": "Fertilizantes balanceados NPK (ej. 10-10-10, 20-20-20).",
    "sin_fertilizante": "Sus niveles de nutrientes son adecuados. No se requiere fertilización."
}

def recomendar_fertilizante(N_suelo, P_suelo, K_suelo, temperatura, humedad, ph, lluvia):
    columnas_features = ["Nitrogen", "Phosphorus", "Potassium", "Temperature", "Humidity", "pH_Value", "Rainfall"]
    datos_entrada = pd.DataFrame([[N_suelo, P_suelo, K_suelo, temperatura, humedad, ph, lluvia]], columns=columnas_features)
    
    datos_entrada_esc = escalador.transform(datos_entrada)
    prediccion_prob = modelo.predict(datos_entrada_esc)
    indice_predicho = np.argmax(prediccion_prob, axis=1)[0]
    cultivo_predicho = coder_etiquetas.inverse_transform([indice_predicho])[0]

    nutrientes_optimos = promedios_nutrientes[cultivo_predicho]
    N_optimo = nutrientes_optimos["Nitrogen"]
    P_optimo = nutrientes_optimos["Phosphorus"]
    K_optimo = nutrientes_optimos["Potassium"]

    N_necesario = N_optimo - N_suelo
    P_necesario = P_optimo - P_suelo
    K_necesario = K_optimo - K_suelo

    umbral = 10
    necesita_N = N_necesario > umbral
    necesita_P = P_necesario > umbral
    necesita_K = K_necesario > umbral

    if necesita_N and necesita_P: recomendacion = fertilizantes_sugeridos["alto_NP"]
    elif necesita_N and necesita_K: recomendacion = fertilizantes_sugeridos["alto_NK"]
    elif necesita_P and necesita_K: recomendacion = fertilizantes_sugeridos["alto_PK"]
    elif necesita_N: recomendacion = fertilizantes_sugeridos["alto_N"]
    elif necesita_P: recomendacion = fertilizantes_sugeridos["alto_P"]
    elif necesita_K: recomendacion = fertilizantes_sugeridos["alto_K"]
    elif N_necesario > 0 or P_necesario > 0 or K_necesario > 0:
        recomendacion = fertilizantes_sugeridos["balanceado"]
    else:
        recomendacion = fertilizantes_sugeridos["sin_fertilizante"]

    resultado = {
        "Cultivo Recomendado": cultivo_predicho.capitalize(),
        "Estado de Nutrientes (Actual vs. Óptimo)": {
            "Nitrógeno (N)": f"Actual: {N_suelo:.1f}, Óptimo: {N_optimo:.1f} -> Necesario: {N_necesario:.1f}",
            "Fósforo (P)": f"Actual: {P_suelo:.1f}, Óptimo: {P_optimo:.1f} -> Necesario: {P_necesario:.1f}",
            "Potasio (K)": f"Actual: {K_suelo:.1f}, Óptimo: {K_optimo:.1f} -> Necesario: {K_necesario:.1f}"
        },
        "Recomendación de Fertilizante": recomendacion
    }
    return resultado

# =============================================================================
# 3. EJEMPLO DE USO
# =============================================================================
resultado1 = recomendar_fertilizante(
    N_suelo=90, P_suelo=42, K_suelo=43,
    temperatura=20.87, humedad=82.0, ph=6.5, lluvia=102.9
)

for key, value in resultado1.items():
    if isinstance(value, dict):
        print(f"\n  - {key}:")
        for sub_key, sub_value in value.items():
            print(f"\n    - {sub_key}: {sub_value}")
    else:
        print(f"\n  - {key}: {value}")

# =============================================================================
# Puntos a considerar
# - En un futuro se puede utilizar una API para obtener la lluvia debido a la importancia dentro de la prediccion del modelo
# - NPK, Humedad del suelo deben ser obtenidos por Sensores
# - Temperatura y PH pueden ser omitidos pero se debe re entrenar el modelo (SOLAMENTE PARA FERTILIZANTE, el riego es otro tema)
# - En un futuro se podrá utilizar el sensor como metodo simple, o ingresar los datos manualmente por un Ing. Agrónomo de ser necesario
# =============================================================================

# =============================================================================
# 4. MONITOREO Y MANTENIMIENTO (POST-SIEMBRA)
# =============================================================================

def monitorear_cultivo_elegido(cultivo_elegido_por_usuario, N_actual, P_actual, K_actual):
    cultivo_key = cultivo_elegido_por_usuario.strip()
    if cultivo_key not in promedios_nutrientes:
        cultivos_disponibles = [c.capitalize() for c in promedios_nutrientes.keys()]
        mensaje_error = (
            f"El cultivo {cultivo_elegido_por_usuario} no se encuentra en nuestra base de datos."
            f"Por favor, elija uno de los siguientes cultivos disponibles:\n\n-{"\n-".join(cultivos_disponibles)}"
        )
        return {"Error": mensaje_error}
    nutrientes_optimos = promedios_nutrientes[cultivo_key]
    N_optimo = nutrientes_optimos["Nitrogen"]
    P_optimo = nutrientes_optimos["Phosphorus"]
    K_optimo = nutrientes_optimos["Potassium"]

    N_necesario = N_optimo - N_actual
    P_necesario = P_optimo - P_actual
    K_necesario = K_optimo - K_actual

    umbral = 10
    necesita_N = N_necesario > umbral
    necesita_P = P_necesario > umbral
    necesita_K = K_necesario > umbral

    if necesita_N and necesita_P: recomendacion = fertilizantes_sugeridos["alto_NP"]
    elif necesita_N and necesita_K: recomendacion = fertilizantes_sugeridos["alto_NK"]
    elif necesita_P and necesita_K: recomendacion = fertilizantes_sugeridos["alto_PK"]
    elif necesita_N: recomendacion = fertilizantes_sugeridos["alto_N"]
    elif necesita_P: recomendacion = fertilizantes_sugeridos["alto_P"]
    elif necesita_K: recomendacion = fertilizantes_sugeridos["alto_K"]
    elif N_necesario > 0 or P_necesario > 0 or K_necesario > 0:
        recomendacion = fertilizantes_sugeridos["balanceado"]
    else:
        recomendacion = fertilizantes_sugeridos["sin_fertilizante"]

    resultado = {
        "Cultivo en Monitoreo": cultivo_elegido_por_usuario.capitalize(),
        "Estado de Nutrientes para Mantenimiento (Actual vs. Óptimo)": {
            "Nitrógeno (N)": f"Actual: {N_actual:.1f}, Óptimo: {N_optimo:.1f} -> Corrección necesaria: {N_necesario:.1f}",
            "Fósforo (P)": f"Actual: {P_actual:.1f}, Óptimo: {P_optimo:.1f} -> Corrección necesaria: {P_necesario:.1f}",
            "Potasio (K)": f"Actual: {K_actual:.1f}, Óptimo: {K_optimo:.1f} -> Corrección necesaria: {K_necesario:.1f}"
        },
        "Recomendación de Fertilizante de Mantenimiento": recomendacion
    }
    return resultado

# =============================================================================
# 5. EJEMPLO DE USO DEL MONITOREO (POST-SIEMBRA)
# =============================================================================

# =============================================================================
# Puntos a considerar
# - A partir de este punto se asume que se utilizaran sensores, con datos en tiempo real.
# - El usuario Ingresará la informacion no por terminal, por la app movil.
# =============================================================================

N_sensor_actual = 65
P_sensor_actual = 35
K_sensor_actual = 40
Menu = True
while Menu != False:
    cultivo_real_usuario = input("\nIngresa el Cultivo a Monitorear, Por favor (Ejemplo Formato: Rice, Apple, Banana, etc.): ")

    resultado_mantenimiento = monitorear_cultivo_elegido(
        cultivo_elegido_por_usuario=cultivo_real_usuario,
        N_actual=N_sensor_actual,
        P_actual=P_sensor_actual,
        K_actual=K_sensor_actual
    )

    for key, value in resultado_mantenimiento.items():
        if isinstance(value, dict):
            print(f"\n  - {key}:")
            for sub_key, sub_value in value.items():
                print(f"\n    - {sub_key}: {sub_value}")
                Menu = False
        else:
            print(f"\n  - {key}: {value}")
            