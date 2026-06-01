"use client"

import { useState, useEffect } from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import type { ChileanCity } from "@/types"

interface CityComboboxProps {
  onSelect: (cityId: number) => void
}

export function CityCombobox({ onSelect }: CityComboboxProps) {
  const [open, setOpen] = useState(false)
  const [cities, setCities] = useState<ChileanCity[]>([])
  const [selectedCity, setSelectedCity] = useState<ChileanCity | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && cities.length === 0) {
      setLoading(true)
      fetch("/api/cities")
        .then((res) => res.json())
        .then((data: ChileanCity[]) => setCities(data))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open, cities.length])

  return (
    <div className="flex flex-col items-center gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="w-[280px] justify-between border border-border text-foreground rounded-lg px-3 py-2 text-sm hover:bg-muted cursor-pointer"
        >
          {selectedCity ? selectedCity.name : "Ingresar Comuna/Ciudad..."}
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <Command>
            <CommandInput placeholder="Buscar ciudad..." />
            <CommandList>
              <CommandEmpty>
                {loading ? "Cargando ciudades..." : "No se encontró la ciudad."}
              </CommandEmpty>
              <CommandGroup>
                {cities.map((city) => (
                  <CommandItem
                    key={city.id}
                    value={city.name}
                    onSelect={() => {
                      setSelectedCity(city)
                      setOpen(false)
                    }}
                  >
                    {city.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button
        onClick={() => {
          if (selectedCity) onSelect(selectedCity.id)
        }}
        disabled={!selectedCity}
        className="uppercase tracking-widest"
      >
        Seleccionar
      </Button>
    </div>
  )
}
