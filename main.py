#%%
# =============================================================================
# 1. IMPORTACIONES Y CONFIGURACIÓN INICIAL
# =============================================================================
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import tensorflow as tf
import os
import keras_tuner as kt
import warnings

from sklearn.model_selection import train_test_split, KFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import xgboost as xgb

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.regularizers import l2
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.utils import plot_model

warnings.filterwarnings("ignore")

# =============================================================================
# 2. FUNCIONES AUXILIARES PARA VISUALIZACIÓN
# =============================================================================
def graficar_matriz_confusion(y_real, y_pred, etiquetas, titulo, nombre_archivo, cmap="Blues"):
    fig, ax = plt.subplots(figsize=(15, 12))
    matriz = confusion_matrix(y_real, y_pred)
    sns.heatmap(matriz, annot=True, fmt="d", cmap=cmap, xticklabels=etiquetas, yticklabels=etiquetas, ax=ax)
    ax.set_title(titulo, fontsize=16)
    ax.set_ylabel("Etiqueta Real", fontsize=12)
    ax.set_xlabel("Etiqueta Predicha", fontsize=12)
    plt.xticks(rotation=45, ha="right")
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig(nombre_archivo, dpi=300)
    plt.show() 

def graficar_importancia_caracteristicas(importancias, nombres_caracteristicas, titulo, nombre_archivo, palette="viridis"):
    df_importancia = pd.DataFrame({"Caracteristica": nombres_caracteristicas, "Importancia": importancias})
    df_importancia = df_importancia.sort_values(by="Importancia", ascending=False)
    
    print(f"\nImportancia de las Características ({titulo}):")
    print(df_importancia)
    
    plt.figure(figsize=(12, 8))
    sns.barplot(x="Importancia", y="Caracteristica", data=df_importancia, palette=palette, hue="Caracteristica", legend=False)
    plt.title(titulo, fontsize=16)
    plt.xlabel("Importancia", fontsize=12)
    plt.ylabel("Característica", fontsize=12)
    plt.tight_layout()
    plt.savefig(nombre_archivo, dpi=300)
    plt.show()
#%%
# =============================================================================
# 3. CARGA Y PREPARACIÓN GENERAL DE DATOS
# =============================================================================
dataset = "Crop_Recommendation.csv"

if not os.path.exists(dataset):
    print(f"Error: No se encontró el archivo {dataset}.")
    exit()

datos_df = pd.read_csv(dataset)
print("\nPrimeras filas del dataset:")
print(datos_df.head())
print("\nDimensiones del dataset:", datos_df.shape)

caracteristicas = datos_df.drop("Crop", axis=1)
objetivo_texto = datos_df["Crop"]

coder_etiquetas = LabelEncoder()
objetivo_codificado = coder_etiquetas.fit_transform(objetivo_texto)

caracteristicas_entrenamiento, caracteristicas_prueba, objetivo_entrenamiento, objetivo_prueba = train_test_split(
    caracteristicas,
    objetivo_codificado,
    test_size=0.2,
    random_state=42,
    stratify=objetivo_codificado
)
print("\nForma del conjunto de entrenamiento (Características):", caracteristicas_entrenamiento.shape)
print("Forma del conjunto de prueba (Características):", caracteristicas_prueba.shape)
#%%
# =============================================================================
# 4. MODELO 1: RANDOM FOREST
# =============================================================================
modelo_rf = RandomForestClassifier(n_estimators=100, random_state=42)
modelo_rf.fit(caracteristicas_entrenamiento, objetivo_entrenamiento)

predicciones_rf = modelo_rf.predict(caracteristicas_prueba)
accuracy_rf = accuracy_score(objetivo_prueba, predicciones_rf)
print(f"\nAccuracy del modelo Random Forest: {accuracy_rf:.4f}")
print("\nClasificación Random Forest:")
print(classification_report(objetivo_prueba, predicciones_rf, target_names=coder_etiquetas.classes_))

graficar_matriz_confusion(
    y_real=objetivo_prueba, 
    y_pred=predicciones_rf, 
    etiquetas=coder_etiquetas.classes_,
    titulo="Matriz de Confusión - Random Forest", 
    nombre_archivo="matriz_confusion_rf.png"
)

graficar_importancia_caracteristicas(
    modelo_rf.feature_importances_,
    caracteristicas.columns,
    "Importancia de las Características - Random Forest",
    "importancia_features_rf.png"
)
#%%
# =============================================================================
# 5. MODELO 2: XGBOOST
# =============================================================================

modelo_xgboost = xgb.XGBClassifier(
    objective="multi:softmax",
    n_estimators=100,
    learning_rate=0.1,
    max_depth=3,
    random_state=42,
    use_label_encoder=False,
    eval_metric="mlogloss"
)
modelo_xgboost.fit(caracteristicas_entrenamiento, objetivo_entrenamiento)

predicciones_xgb = modelo_xgboost.predict(caracteristicas_prueba)
accuracy_xgb = accuracy_score(objetivo_prueba, predicciones_xgb)
print(f"\nAccuracy del modelo XGBoost: {accuracy_xgb:.4f}")
print("\nClasificación XGBoost:")
print(classification_report(objetivo_prueba, predicciones_xgb, target_names=coder_etiquetas.classes_))

graficar_matriz_confusion(
    y_real=objetivo_prueba,
    y_pred=predicciones_xgb,
    etiquetas=coder_etiquetas.classes_,
    titulo="Matriz de Confusión - XGBoost",
    nombre_archivo="matriz_confusion_xgb.png",
    cmap="Greens"
)

graficar_importancia_caracteristicas(
    modelo_xgboost.feature_importances_,
    caracteristicas.columns,
    "Importancia de las Características - XGBoost",
    "importancia_features_xgb.png",
    "rocket"
)
#%%
# =============================================================================
# 6. MODELO 3: RED NEURONAL
# =============================================================================

# Poner en True para utilizar la búsqueda con Keras Tuner.
# Poner en False para saltar la búsqueda y usar los hiperparámetros guardados.
busqueda = True

escalador_caracteristicas = StandardScaler()
caracteristicas_entrenamiento_esc = escalador_caracteristicas.fit_transform(caracteristicas_entrenamiento)
caracteristicas_prueba_esc = escalador_caracteristicas.transform(caracteristicas_prueba)

joblib.dump(escalador_caracteristicas, "escalador_caracteristicas.pkl")
joblib.dump(coder_etiquetas, "coder_etiquetas.pkl")
print("Objetos escalador_caracteristicas.pkl y coder_etiquetas.pkl guardados.")

# Codificación One-Hot
num_clases = len(coder_etiquetas.classes_)
objetivo_entrenamiento_cat = to_categorical(objetivo_entrenamiento, num_classes=num_clases)
objetivo_prueba_cat = to_categorical(objetivo_prueba, num_classes=num_clases)
print("Datos pre-procesados y listos.")

if busqueda:
    def construir_modelo(hp):
        modelo = Sequential()
        modelo.add(Dense(units=hp.Int("unidades_entrada", min_value=64, max_value=256, step=32), activation="relu", input_shape=(caracteristicas_entrenamiento_esc.shape[1],), kernel_regularizer=l2(hp.Float("l2_entrada", min_value=1e-5, max_value=1e-2, sampling="log"))))
        modelo.add(Dropout(rate=hp.Float("dropout_entrada", min_value=0.1, max_value=0.5, step=0.05)))
        for i in range(hp.Int("num_capas", 1, 3)):
            modelo.add(Dense(units=hp.Int(f"unidades_{i}", min_value=32, max_value=128, step=32), activation="relu", kernel_regularizer=l2(hp.Float(f"l2_{i}", min_value=1e-5, max_value=1e-2, sampling="log"))))
            modelo.add(Dropout(rate=hp.Float(f"dropout_{i}", min_value=0.1, max_value=0.5, step=0.05)))
        modelo.add(Dense(num_clases, activation="softmax"))
        tasa_aprendizaje = hp.Float("lr", min_value=1e-4, max_value=1e-2, sampling="log")
        modelo.compile(optimizer=Adam(learning_rate=tasa_aprendizaje), loss="categorical_crossentropy", metrics=["accuracy"])
        return modelo

    tuner = kt.Hyperband(
        construir_modelo,
        objective="val_accuracy",
        max_epochs=100,
        factor=3,
        directory="keras_tuner_dir",
        project_name="clasificacion_cultivos_v3",
        overwrite=True
    )
    
    parada_temprana = EarlyStopping(monitor="val_loss", patience=10, verbose=1)
    tuner.search(
        caracteristicas_entrenamiento_esc,
        objetivo_entrenamiento_cat,
        epochs=150,
        validation_data=(caracteristicas_prueba_esc, objetivo_prueba_cat),
        callbacks=[parada_temprana]
    )
#%%
# =============================================================================
# 7. EVALUACIÓN Y ENTRENAMIENTO DEL MODELO FINAL
# =============================================================================

if busqueda:
    if "tuner" in locals():
        hiperparametros = tuner.get_best_hyperparameters(num_trials=1)[0].values
    else:
        raise Exception("Corre la Sección 6 primero.")
else:
    hiperparametros = {
    "unidades_entrada": 256,
    "l2_entrada": 0.00010471728970707508,
    "dropout_entrada": 0.35,
    "num_capas": 1,
    "unidades_0": 32,
    "l2_0": 3.963546056348702e-05,
    "dropout_0": 0.2,
    "lr": 0.003900141455233097
}

modelo_final_nn = Sequential()
modelo_final_nn.add(Dense(
    units=hiperparametros["unidades_entrada"], activation="relu", 
    input_shape=(caracteristicas_entrenamiento_esc.shape[1],), 
    kernel_regularizer=l2(hiperparametros["l2_entrada"])
))
modelo_final_nn.add(Dropout(rate=hiperparametros["dropout_entrada"]))

for i in range(hiperparametros["num_capas"]):
    modelo_final_nn.add(Dense(
        units=hiperparametros[f"unidades_{i}"], activation="relu", 
        kernel_regularizer=l2(hiperparametros[f"l2_{i}"])
    ))
    modelo_final_nn.add(Dropout(rate=hiperparametros[f"dropout_{i}"]))

modelo_final_nn.add(Dense(num_clases, activation="softmax"))

plot_model(
    modelo_final_nn,
    to_file="arquitectura_modelo_final.png",
    show_shapes=True,
    show_layer_names=True,
    show_layer_activations=True,
    dpi=96
)

modelo_final_nn.compile(
    optimizer=Adam(learning_rate=hiperparametros["lr"]),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)
modelo_final_nn.summary()

historial_entrenamiento = modelo_final_nn.fit(
    caracteristicas_entrenamiento_esc,
    objetivo_entrenamiento_cat,
    epochs=150,
    batch_size=32,
    validation_data=(caracteristicas_prueba_esc, objetivo_prueba_cat),
    callbacks=[EarlyStopping(monitor="val_loss", patience=15, verbose=1, restore_best_weights=True)],
    verbose=1
)

loss, accuracy_nn = modelo_final_nn.evaluate(caracteristicas_prueba_esc, objetivo_prueba_cat, verbose=0)
print(f"\nAccuracy del modelo final: {accuracy_nn:.4f}")

predicciones_prob_nn = modelo_final_nn.predict(caracteristicas_prueba_esc)
predicciones_indices_nn = np.argmax(predicciones_prob_nn, axis=1)
print("\nReporte Modelo Final:")
print(classification_report(objetivo_prueba, predicciones_indices_nn, target_names=coder_etiquetas.classes_))

graficar_matriz_confusion(
    y_real=objetivo_prueba,
    y_pred=predicciones_indices_nn,
    etiquetas=coder_etiquetas.classes_,
    titulo="Matriz de Confusión - Modelo Final Red Neuronal",
    nombre_archivo="matriz_confusion_red_neuronal.png",
    cmap="YlGnBu"
)

modelo_final_nn.save("clasificador_cultivos.keras")
print("\nModelo guardado como clasificador_cultivos.keras")

hist_df = pd.DataFrame(historial_entrenamiento.history)
plt.figure(figsize=(12, 5))
plt.subplot(1, 2, 1)
plt.plot(hist_df["accuracy"], label="Accuracy de Entrenamiento")
plt.plot(hist_df["val_accuracy"], label="Accuracy de Validación")
plt.title("Historial de Accuracy del Mejor Modelo")
plt.xlabel("Época")
plt.ylabel("Accuracy")
plt.legend()
plt.subplot(1, 2, 2)
plt.plot(hist_df["loss"], label="Pérdida de Entrenamiento")
plt.plot(hist_df["val_loss"], label="Pérdida de Validación")
plt.title("Historial de Pérdida del Mejor Modelo")
plt.xlabel("Época")
plt.ylabel("Pérdida")
plt.legend()
plt.tight_layout()
plt.savefig("historial_entrenamiento_red_neuronal.png", dpi=300)
plt.show()
#%%
# =============================================================================
# 8. MODELO DE ENSAMBLE
# =============================================================================

modelo_base_rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
modelo_base_xgb = xgb.XGBClassifier(objective="multi:softmax", n_estimators=100, random_state=42, use_label_encoder=False, eval_metric="mlogloss", n_jobs=-1)
modelo_base_svc = SVC(probability=True, random_state=42)
modelo_base_knn = KNeighborsClassifier(n_neighbors=5, n_jobs=-1)

modelos_base = [
    ('rf', modelo_base_rf),
    ('xgb', modelo_base_xgb),
    ('svc', modelo_base_svc),
    ('knn', modelo_base_knn)
]

meta_clasificador = LogisticRegression(solver="liblinear")

n_entrenamiento = caracteristicas_entrenamiento_esc.shape[0]
n_prueba = caracteristicas_prueba_esc.shape[0]
n_clases = len(coder_etiquetas.classes_)
n_meta_features_por_modelo = n_clases
n_total_meta_features = len(modelos_base) * n_meta_features_por_modelo
meta_features_entrenamiento = np.zeros((n_entrenamiento, n_total_meta_features))
meta_features_prueba = np.zeros((n_prueba, n_total_meta_features))

kf = KFold(n_splits=5, shuffle=True, random_state=42)

for i, (nombre, modelo) in enumerate(modelos_base):
    for train_index, val_index in kf.split(caracteristicas_entrenamiento_esc, objetivo_entrenamiento):
        X_train_fold, X_val_fold = caracteristicas_entrenamiento_esc[train_index], caracteristicas_entrenamiento_esc[val_index]
        y_train_fold = objetivo_entrenamiento[train_index]
        
        modelo.fit(X_train_fold, y_train_fold)
        
        col_inicio = i * n_meta_features_por_modelo
        col_fin = col_inicio + n_meta_features_por_modelo
        meta_features_entrenamiento[val_index, col_inicio:col_fin] = modelo.predict_proba(X_val_fold)


for i, (nombre, modelo) in enumerate(modelos_base):
    modelo.fit(caracteristicas_entrenamiento_esc, objetivo_entrenamiento)
    
    col_inicio = i * n_meta_features_por_modelo
    col_fin = col_inicio + n_meta_features_por_modelo
    meta_features_prueba[:, col_inicio:col_fin] = modelo.predict_proba(caracteristicas_prueba_esc)


entrenamiento_final_meta = np.concatenate([caracteristicas_entrenamiento_esc, meta_features_entrenamiento], axis=1)
prueba_final_meta = np.concatenate([caracteristicas_prueba_esc, meta_features_prueba], axis=1)

meta_clasificador.fit(entrenamiento_final_meta, objetivo_entrenamiento)
predicciones_ensamble_manual = meta_clasificador.predict(prueba_final_meta)

accuracy_ensamble_manual = accuracy_score(objetivo_prueba, predicciones_ensamble_manual)
print(f"\nAccuracy del modelo de Ensamble: {accuracy_ensamble_manual:.4f}")

print("\nClasificación de Ensamble :")
print(classification_report(objetivo_prueba, predicciones_ensamble_manual, target_names=coder_etiquetas.classes_))

graficar_matriz_confusion(
    y_real=objetivo_prueba,
    y_pred=predicciones_ensamble_manual,
    etiquetas=coder_etiquetas.classes_,
    titulo="Matriz de Confusión - Ensamble",
    nombre_archivo="matriz_confusion_ensamble.png",
    cmap="Greens"
)
# %%
