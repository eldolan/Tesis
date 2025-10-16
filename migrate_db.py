#!/usr/bin/env python3
"""
Script para migrar la base de datos y añadir las nuevas columnas
"""

import sqlite3
import os

def migrate_database():
    """Añadir nuevas columnas a la tabla lectura_riego"""
    db_path = 'instance/adminpanel.db'
    
    if not os.path.exists(db_path):
        print(f"Base de datos no encontrada: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Verificar si las columnas ya existen
    cursor.execute("PRAGMA table_info(lectura_riego)")
    columns = [column[1] for column in cursor.fetchall()]
    
    print(f"Columnas actuales en lectura_riego: {columns}")
    
    # Añadir nuevas columnas si no existen
    new_columns = [
        ('temperatura_c', 'FLOAT'),
        ('conductividad_us_cm', 'FLOAT'), 
        ('ph', 'FLOAT')
    ]
    
    for column_name, column_type in new_columns:
        if column_name not in columns:
            try:
                cursor.execute(f"ALTER TABLE lectura_riego ADD COLUMN {column_name} {column_type}")
                print(f"✓ Añadida columna: {column_name}")
            except sqlite3.Error as e:
                print(f"✗ Error añadiendo {column_name}: {e}")
        else:
            print(f"- Columna {column_name} ya existe")
    
    conn.commit()
    conn.close()
    
    print("\n¡Migración completada!")

def verificar_datos():
    """Verificar los datos después de la migración"""
    db_path = 'instance/adminpanel.db'
    
    if not os.path.exists(db_path):
        print("\nBase de datos no existe localmente. Esto es normal en desarrollo.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Mostrar estructura actualizada
        cursor.execute("PRAGMA table_info(lectura_riego)")
        columns = cursor.fetchall()
        
        print("\nEstructura actualizada de lectura_riego:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
        
        # Mostrar algunos datos recientes
        cursor.execute("SELECT * FROM lectura_riego ORDER BY timestamp DESC LIMIT 3")
        records = cursor.fetchall()
        
        print(f"\nÚltimos 3 registros:")
        for record in records:
            print(f"  {record}")
            
    except sqlite3.Error as e:
        print(f"Error verificando datos: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("=== MIGRACIÓN DE BASE DE DATOS ===")
    migrate_database()
    verificar_datos()