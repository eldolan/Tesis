import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
import warnings
import joblib

warnings.filterwarnings("ignore")

def calcular_eto(T, Rn, G, u2, es, ea, delta, gamma):
    numerador = (0.408 * delta * (Rn - G)) + (gamma * (900 / (T + 273)) * u2 * (es - ea))
    denominador = delta + (gamma * (1 + 0.34 * u2))
    return numerador / denominador if denominador != 0 else 0

def obtener_coeficiente_cultivo(nombre_cultivo):
    coeficientes_kc = {
        "rice": 1.05, "maize": 1.15, "chickpea": 1.05, "kidneybeans": 1.10,
        "pigeonpeas": 1.05, "mothbeans": 0.95, "mungbean": 0.90, "blackgram": 0.90,
        "lentil": 1.05, "pomegranate": 0.75, "banana": 1.05, "mango": 0.70,
        "grapes": 0.80, "watermelon": 0.95, "muskmelon": 0.90, "apple": 0.90,
        "orange": 0.85, "papaya": 0.80, "coconut": 0.95, "cotton": 1.15,
        "jute": 1.10, "coffee": 0.90
    }
    return coeficientes_kc.get(nombre_cultivo.lower(), 1.0)


def generar_dataset_riego(df_original):
    df = df_original.copy()
    
    np.random.seed(42)
    df["Rn"] = np.random.uniform(5, 20, size=len(df))
    df["u2"] = np.random.uniform(0.5, 4, size=len(df))
    df["G"] = 0.1 * df["Rn"]
    df["delta"] = 0.0407 * np.exp(0.0625 * df["Temperature"])
    df["gamma"] = 0.067
    df["es"] = 0.6108 * np.exp((17.27 * df["Temperature"]) / (df["Temperature"] + 237.3))
    df["ea"] = (df["Humidity"] / 100) * df["es"]

    df["ET_o"] = df.apply(lambda row: calcular_eto(
        row["Temperature"], row["Rn"], row["G"], row["u2"], 
        row["es"], row["ea"], row["delta"], row["gamma"]
    ), axis=1)
    df["Kc"] = df["Crop"].apply(obtener_coeficiente_cultivo)
    df["ET_crop"] = df["ET_o"] * df["Kc"]

    df["decision_riego"] = ((df["ET_crop"] - (df["Rainfall"] / 7)) > 0.6).astype(int)

    counts = df.decision_riego.value_counts()
    
    if 1 not in counts or 0 not in counts:
        print("    \n- No se puede balancear: una clase no tiene muestras.")
        return df.sample(frac=1, random_state=42).reset_index(drop=True)

    if counts[0] == counts[1]:
        print("    \n- El dataset ya está balanceado.")
        return df.sample(frac=1, random_state=42).reset_index(drop=True)

    df_no_regar = df[df["decision_riego"] == 0]
    df_regar = df[df["decision_riego"] == 1]

    if counts[0] > counts[1]:
        df_regar_over = df_regar.sample(counts[0], replace=True, random_state=42)
        df_balanceado = pd.concat([df_no_regar, df_regar_over], axis=0)
    else:
        df_no_regar_over = df_no_regar.sample(counts[1], replace=True, random_state=42)
        df_balanceado = pd.concat([df_no_regar_over, df_regar], axis=0)
    
    print(f"    \n- Dataset final:")
    print("\n",df_balanceado.decision_riego.value_counts().to_string(),"\n")
    
    return df_balanceado.sample(frac=1, random_state=42).reset_index(drop=True)

def entrenar_modelo_decision(df_entrenamiento):
    nombre_modelo = "modelo_decision_riego_rf.pkl"
    nombre_escalador = "escalador_decision_riego.pkl"

    features = ["Nitrogen", "Phosphorus", "Potassium", "Temperature", "Humidity", "pH_Value", "Rainfall", "ET_crop"]
    target = "decision_riego"

    X = df_entrenamiento[features]
    y = df_entrenamiento[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    escalador = StandardScaler()
    X_train_scaled = escalador.fit_transform(X_train)
    X_test_scaled = escalador.transform(X_test)

    modelo = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42, n_jobs=-1)
    
    modelo.fit(X_train_scaled, y_train)
    
    y_pred = modelo.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"    \nPrecisión del modelo: {accuracy*100:.2f}%")
    joblib.dump(modelo, nombre_modelo)
    joblib.dump(escalador, nombre_escalador)
    print(f"    \n- Modelo guardado como {nombre_modelo}")
    print(f"    \n- Escalador guardado como {nombre_escalador}")

    return modelo, escalador

def ejecutar_prototipo_ia_directa(nombre_escenario, datos_sensor, params_eto, modelo, escalador):
    et_o = calcular_eto(**params_eto)
    cultivo_escenario = "Maize" if "Secas" in nombre_escenario else "Rice"
    kc = obtener_coeficiente_cultivo(cultivo_escenario)
    et_crop = et_o * kc
    print(f"    \n- Necesidad de Agua del Cultivo (ET_crop): {et_crop:.2f} mm/día")

    vector_features = datos_sensor + [et_crop]
    datos_np = np.array([vector_features])
    datos_escalados = escalador.transform(datos_np)
    print(f"    \n- Vector de entrada preparado y escalado.")

    prediccion_proba = modelo.predict_proba(datos_escalados)[0][1]
    decision_binaria = modelo.predict(datos_escalados)[0]
    print(f"    \n- probabilidad de riego: {prediccion_proba:.3f}")

    if decision_binaria == 1:
        print("\nREGAR.")
    else:
        print("\nNO REGAR.")


if __name__ == "__main__":
    try:
        df_cultivos = pd.read_csv("Crop_Recommendation.csv")
    except FileNotFoundError:
        print("Error: No se encontró Crop_Recommendation.csv.")
        exit()

    df_riego_balanceado = generar_dataset_riego(df_cultivos)
    modelo_decision, escalador_modelo = entrenar_modelo_decision(df_riego_balanceado)

    # ========================================================================
    # Ejemplo 1: CONDICIONES SECAS Y CÁLIDAS -> DEBERÍA REGAR
    # ========================================================================
    print("\nEjecutando Escenario 1: Condiciones Secas")
    datos_sensor_regar = [90, 42, 43, 30.0, 40.0, 6.5, 10.0]
    parametros_eto_regar = {
        "T": 30.0, "Rn": 18.0, "G": 1.8, "u2": 2.5, "es": 4.24, 
        "ea": 1.70, "delta": 0.24, "gamma": 0.067
    }
    
    ejecutar_prototipo_ia_directa(
        "Condiciones Secas", 
        datos_sensor_regar, 
        parametros_eto_regar,
        modelo_decision,
        escalador_modelo
    )

    # ========================================================================
    # Ejemplo 2: CONDICIONES HÚMEDAS Y FRESCAS -> NO DEBERÍA REGAR
    # ========================================================================
    print("\nEjecutando Escenario 2: Condiciones Húmedas")
    datos_sensor_no_regar = [80, 47, 38, 22.0, 85.0, 6.8, 150.0]
    parametros_eto_no_regar = {
        "T": 22.0, "Rn": 8.0, "G": 0.8, "u2": 0.8, "es": 2.64, 
        "ea": 2.24, "delta": 0.16, "gamma": 0.067
    }

    ejecutar_prototipo_ia_directa(
        "Condiciones Húmedas",
        datos_sensor_no_regar, 
        parametros_eto_no_regar,
        modelo_decision,
        escalador_modelo
    )