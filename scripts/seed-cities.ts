/**
 * Script para poblar la tabla chilean_cities en Supabase.
 * Lee city.list.json, filtra ciudades de Chile (CL), e inserta en batch.
 *
 * Uso: npx tsx scripts/seed-cities.ts
 *
 * Requiere variables de entorno:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  const cityFilePath = resolve(__dirname, '../../app/city.list.json')
  console.log(`Leyendo ${cityFilePath}...`)

  const raw = readFileSync(cityFilePath, 'utf-8')
  const allCities = JSON.parse(raw) as Array<{ id: number; name: string; country: string }>

  const chileanCities = allCities
    .filter((c) => c.country === 'CL')
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  console.log(`Encontradas ${chileanCities.length} ciudades chilenas.`)

  // Insertar en batches de 500
  const BATCH_SIZE = 500
  for (let i = 0; i < chileanCities.length; i += BATCH_SIZE) {
    const batch = chileanCities.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('chilean_cities')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`Error en batch ${i / BATCH_SIZE + 1}:`, error.message)
    } else {
      console.log(`Batch ${i / BATCH_SIZE + 1}: ${batch.length} ciudades insertadas.`)
    }
  }

  console.log('Seed completado.')
}

seed().catch(console.error)
