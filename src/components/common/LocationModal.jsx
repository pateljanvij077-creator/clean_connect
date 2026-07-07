import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Navigation, Search, X, Loader2, Landmark } from 'lucide-react'
import { getCurrentPosition, getLocationDetails } from '../../utils/gps'
import { findOrCreateState, findOrCreateCity, findOrCreateArea, findOrCreateSociety, searchSocieties } from '../../services/locations'
import { supabase } from '../../supabase/client'
import { toast } from 'react-hot-toast'

export default function LocationModal({ isOpen, onClose, homeowner, worker, user, onLocationUpdated, forceSelection = false }) {
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [localSocieties, setLocalSocieties] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  
  const searchTimeoutRef = useRef(null)

  // Clear search and suggestions on open/close
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setSuggestions([])
      setLocalSocieties([])
    }
  }, [isOpen])

  // Debounced search trigger for Photon API + Local Database
  useEffect(() => {
    if (!search || search.trim().length < 3) {
      setSuggestions([])
      setLocalSocieties([])
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    setSearchLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // 1. Search locally in our own registered societies
        const localSoc = await searchSocieties(search)
        setLocalSocieties(localSoc || [])

        // 2. Search using Photon API (OpenStreetMap geocoder autocomplete)
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(search)}&limit=6`
        )
        if (response.ok) {
          const data = await response.json()
          if (data.features) {
            setSuggestions(data.features)
          }
        }
      } catch (err) {
        console.error('Error autocomplete searching:', err)
      } finally {
        setSearchLoading(false)
      }
    }, 400) // 400ms debounce

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [search])

  // Process geolocation and save to Supabase
  const handleAutoDetect = async () => {
    setLoading(true)
    try {
      const coords = await getCurrentPosition()
      const details = await getLocationDetails(coords.lat, coords.lng)
      await saveLocationData(coords.lat, coords.lng, details)
      toast.success('Current location detected successfully!')
      onLocationUpdated()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Location access denied or failed. Please search manually.')
    } finally {
      setLoading(false)
    }
  }

  // Common function to normalize and save location coordinates to DB
  const saveLocationData = async (latitude, longitude, details) => {
    let stateId = null
    let cityId = null
    let areaId = null
    let societyId = null

    if (details.state) {
      const st = await findOrCreateState(details.state)
      stateId = st.id
    }
    if (details.city && stateId) {
      const ct = await findOrCreateCity(details.city, stateId)
      cityId = ct.id
    }
    if (details.area && cityId) {
      const ar = await findOrCreateArea(details.area, cityId)
      areaId = ar.id
    }

    if (homeowner) {
      if (details.society && areaId && cityId) {
        const soc = await findOrCreateSociety({
          name: details.society,
          areaId,
          cityId,
          latitude,
          longitude,
          address: details.address
        })
        societyId = soc.id
      }

      const { error } = await supabase
        .from('homeowners')
        .update({
          state_id: stateId,
          city_id: cityId,
          area_id: areaId,
          society_id: societyId,
          society_name: details.society || homeowner?.society_name || 'My Location',
          address: details.address || homeowner?.address || '',
          latitude: latitude,
          longitude: longitude
        })
        .eq('user_id', user.id)

      if (error) throw error
    } else if (worker) {
      // Update workers table
      const { error: workerErr } = await supabase
        .from('workers')
        .update({
          latitude: latitude,
          longitude: longitude,
          current_city: details.city || null,
          current_area: details.area || null,
          last_location_update: new Date().toISOString()
        })
        .eq('id', worker.id)

      if (workerErr) throw workerErr

      // Check if primary location exists in worker_locations
      const { data: existingLocs, error: fetchLocsErr } = await supabase
        .from('worker_locations')
        .select('*')
        .eq('worker_id', worker.id)
        .eq('is_primary', true)

      if (fetchLocsErr) throw fetchLocsErr

      const primaryLoc = existingLocs && existingLocs[0]

      if (primaryLoc) {
        const { error: updateLocErr } = await supabase
          .from('worker_locations')
          .update({
            state_id: stateId,
            city_id: cityId,
            area_id: areaId,
            state_name: details.state || null,
            city_name: details.city || null,
            area_name: details.area || null,
            society_name: details.society || 'All Societies',
            latitude: latitude,
            longitude: longitude
          })
          .eq('id', primaryLoc.id)
        if (updateLocErr) throw updateLocErr
      } else {
        const { error: insertLocErr } = await supabase
          .from('worker_locations')
          .insert([{
            worker_id: worker.id,
            state_id: stateId,
            city_id: cityId,
            area_id: areaId,
            state_name: details.state || null,
            city_name: details.city || null,
            area_name: details.area || null,
            society_name: details.society || 'All Societies',
            latitude: latitude,
            longitude: longitude,
            is_primary: true
          }])
        if (insertLocErr) throw insertLocErr
      }
    }
  }

  // Handle selecting a Photon Autocomplete Suggestion
  const handleSelectSuggestion = async (feature) => {
    setLoading(true)
    try {
      const [lng, lat] = feature.geometry.coordinates
      const props = feature.properties

      // Formulate detailed address information
      const name = props.name || ''
      const street = props.street || ''
      const city = props.city || props.town || ''
      const state = props.state || ''
      const country = props.country || ''
      const area = props.district || props.suburb || ''

      const addressString = [name, street, area, city, state, country].filter(Boolean).join(', ')

      const details = {
        state: state || 'Default State',
        city: city || 'Default City',
        area: area || city || 'Default Area',
        society: name || street || 'My Location',
        address: addressString
      }

      await saveLocationData(lat, lng, details)
      toast.success(`Location set to: ${details.society}`)
      onLocationUpdated()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(`Failed to set selected address: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle selecting a local database Society record
  const handleSelectLocalSociety = async (soc) => {
    setLoading(true)
    try {
      if (homeowner) {
        const { error } = await supabase
          .from('homeowners')
          .update({
            state_id: soc.state_id || homeowner?.state_id,
            city_id: soc.city_id,
            area_id: soc.area_id,
            society_id: soc.id,
            society_name: soc.name,
            address: soc.address || `${soc.name}, ${soc.areas?.name || ''}, ${soc.cities?.name || ''}`,
            latitude: soc.latitude,
            longitude: soc.longitude
          })
          .eq('user_id', user.id)

        if (error) throw error
      } else if (worker) {
        // Update workers table
        const { error: workerErr } = await supabase
          .from('workers')
          .update({
            latitude: soc.latitude,
            longitude: soc.longitude,
            current_city: soc.cities?.name || null,
            current_area: soc.areas?.name || null,
            last_location_update: new Date().toISOString()
          })
          .eq('id', worker.id)

        if (workerErr) throw workerErr

        // Check if primary location exists in worker_locations
        const { data: existingLocs, error: fetchLocsErr } = await supabase
          .from('worker_locations')
          .select('*')
          .eq('worker_id', worker.id)
          .eq('is_primary', true)

        if (fetchLocsErr) throw fetchLocsErr

        const primaryLoc = existingLocs && existingLocs[0]

        if (primaryLoc) {
          const { error: updateLocErr } = await supabase
            .from('worker_locations')
            .update({
              state_id: soc.state_id || null,
              city_id: soc.city_id,
              area_id: soc.area_id,
              society_id: soc.id,
              state_name: null,
              city_name: soc.cities?.name || null,
              area_name: soc.areas?.name || null,
              society_name: soc.name,
              latitude: soc.latitude,
              longitude: soc.longitude
            })
            .eq('id', primaryLoc.id)
          if (updateLocErr) throw updateLocErr
        } else {
          const { error: insertLocErr } = await supabase
            .from('worker_locations')
            .insert([{
              worker_id: worker.id,
              state_id: soc.state_id || null,
              city_id: soc.city_id,
              area_id: soc.area_id,
              society_id: soc.id,
              state_name: null,
              city_name: soc.cities?.name || null,
              area_name: soc.areas?.name || null,
              society_name: soc.name,
              latitude: soc.latitude,
              longitude: soc.longitude,
              is_primary: true
            }])
          if (insertLocErr) throw insertLocErr
        }
      }

      toast.success(`Location set to: ${soc.name}`)
      onLocationUpdated()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(`Failed to save selected society: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem'
        }}>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !forceSelection && onClose()}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(6, 9, 19, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="card glass"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              zIndex: 1000,
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              position: 'relative',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-glass)',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Choose your Location</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Please set your address to discover nearby cleaners
                </p>
              </div>
              {!forceSelection && (
                <button
                  onClick={onClose}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* GPS Detection Action */}
            <button
              onClick={handleAutoDetect}
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                gap: '8px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--gradient-primary)'
              }}
            >
              {loading ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <Navigation size={18} />
              )}
              {loading ? 'Detecting Location...' : 'Detect Current Location (GPS)'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                OR SEARCH MANUALLY
              </span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search society, city, area name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '2.75rem',
                  paddingRight: '1rem',
                  height: '46px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-glass)'
                }}
              />
              {searchLoading && (
                <Loader2
                  size={16}
                  className="spin"
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }}
                />
              )}
            </div>

            {/* Suggestion Dropdowns */}
            {(suggestions.length > 0 || localSocieties.length > 0) && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {/* Local Registered Societies Header */}
                {localSocieties.length > 0 && (
                  <div>
                    <h5 style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', paddingLeft: '8px' }}>
                      Registered Societies ({localSocieties.length})
                    </h5>
                    {localSocieties.map((soc) => (
                      <button
                        key={`local-${soc.id}`}
                        onClick={() => handleSelectLocalSociety(soc)}
                        disabled={loading}
                        className="btn btn-ghost"
                        style={{
                          width: '100%',
                          justifyContent: 'flex-start',
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          border: '1px solid transparent',
                          gap: '10px',
                          background: 'rgba(99, 102, 241, 0.04)',
                          marginBottom: '4px'
                        }}
                      >
                        <Landmark size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {soc.name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {soc.areas?.name || ''}, {soc.cities?.name || ''}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Map Autocomplete suggestions */}
                {suggestions.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <h5 style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', paddingLeft: '8px' }}>
                      Search Results ({suggestions.length})
                    </h5>
                    {suggestions.map((feature, idx) => {
                      const props = feature.properties
                      const mainText = props.name || props.street || 'Address Result'
                      const subText = [props.district, props.city, props.state, props.country].filter(Boolean).join(', ')

                      return (
                        <button
                          key={`photon-${idx}`}
                          onClick={() => handleSelectSuggestion(feature)}
                          disabled={loading}
                          className="btn btn-ghost"
                          style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            padding: '10px 12px',
                            textAlign: 'left',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            border: '1px solid transparent',
                            gap: '10px',
                            marginBottom: '4px'
                          }}
                        >
                          <MapPin size={16} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {mainText}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {subText}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Blank State helper inside popup */}
            {search.trim().length >= 3 && suggestions.length === 0 && localSocieties.length === 0 && !searchLoading && (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No matching places or societies found. Try adjusting spelling or type a nearby city.
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
