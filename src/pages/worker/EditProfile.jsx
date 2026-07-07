import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../supabase/client'
import { 
  getWorkerLocations, 
  addWorkerLocation, 
  removeWorkerLocation, 
  uploadWorkerPhoto, 
  uploadWorkerSelfie,
  uploadUpiQr 
} from '../../services/workers'
import { getStates, getCities, getAreas, searchSocieties, findOrCreateState, findOrCreateCity, findOrCreateArea, findOrCreateSociety } from '../../services/locations'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Trash2, Plus, FileUp, QrCode, MapPin, Navigation } from 'lucide-react'
import { getCurrentPosition, getLocationDetails } from '../../utils/gps'
import LocationPicker from '../../components/maps/LocationPicker'

export default function EditProfile() {
  const navigate = useNavigate()
  const { worker, user, refreshProfile } = useAuth()

  // Form fields
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState(1)
  const [pricingPerHour, setPricingPerHour] = useState(150)
  const [pricingPerDay, setPricingPerDay] = useState(800)
  const [pricingNote, setPricingNote] = useState('')
  const [phone2, setPhone2] = useState('')
  const [languages, setLanguages] = useState([])
  const [newLanguage, setNewLanguage] = useState('')
  
  const [saving, setSaving] = useState(false)

  // Photo uploads
  const [avatarFile, setAvatarFile] = useState(null)
  const [selfieFile, setSelfieFile] = useState(null)
  const [upiFile, setUpiFile] = useState(null)

  // Locations manager lists
  const [locations, setLocations] = useState([])
  const [states, setStates] = useState([])
  const [selLoc, setSelLoc] = useState({
    stateName: '',
    cityName: '',
    areaName: '',
    societyName: '',
    latitude: null,
    longitude: null,
    address: ''
  })
  const [addStatesList, setAddStatesList] = useState([])
  const [addCitiesList, setAddCitiesList] = useState([])
  const [addAreasList, setAddAreasList] = useState([])
  const [addSocietiesList, setAddSocietiesList] = useState([])

  const [showAddStateSuggestions, setShowAddStateSuggestions] = useState(false)
  const [showAddCitySuggestions, setShowAddCitySuggestions] = useState(false)
  const [showAddAreaSuggestions, setShowAddAreaSuggestions] = useState(false)
  const [showAddSocietySuggestions, setShowAddSocietySuggestions] = useState(false)
  const [travelRadius, setTravelRadius] = useState(10)
  const [maxSelectableSocieties, setMaxSelectableSocieties] = useState(10)

  // Primary Location states
  const [primaryLat, setPrimaryLat] = useState(null)
  const [primaryLng, setPrimaryLng] = useState(null)
  const [primaryAddress, setPrimaryAddress] = useState('')
  const [primaryStateId, setPrimaryStateId] = useState('')
  const [primaryCityId, setPrimaryCityId] = useState('')
  const [primaryAreaId, setPrimaryAreaId] = useState('')
  const [primaryStateName, setPrimaryStateName] = useState('')
  const [primaryCityName, setPrimaryCityName] = useState('')
  const [primaryAreaName, setPrimaryAreaName] = useState('')
  const [primarySocietyName, setPrimarySocietyName] = useState('')
  
  const [primaryCities, setPrimaryCities] = useState([])
  const [primaryAreas, setPrimaryAreas] = useState([])

  // Fetch max_selectable_societies on mount
  useEffect(() => {
    supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'max_selectable_societies')
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.value) {
          setMaxSelectableSocieties(Number(data.value))
        }
      })
  }, [])

  useEffect(() => {
    if (worker) {
      setFullName(worker.full_name || '')
      setBio(worker.bio || '')
      setExperience(worker.experience_years || 1)
      setPricingPerHour(worker.pricing_per_hour || 150)
      setPricingPerDay(worker.pricing_per_day || 800)
      setPricingNote(worker.pricing_note || '')
      setPhone2(worker.phone2 || '')
      setLanguages(worker.languages || [])
      setTravelRadius(worker.travel_radius || 10)

      // Load locations
      getWorkerLocations(worker.id).then(locs => {
        setLocations(locs)
        const primary = locs.find(l => l.is_primary)
        if (primary) {
          setPrimaryLat(primary.latitude || worker.latitude || null)
          setPrimaryLng(primary.longitude || worker.longitude || null)
          setPrimaryAddress(primary.address || '')
          setPrimaryStateId(primary.state_id || '')
          setPrimaryCityId(primary.city_id || '')
          setPrimaryAreaId(primary.area_id || '')
          setPrimaryStateName(primary.state_name || '')
          setPrimaryCityName(primary.city_name || '')
          setPrimaryAreaName(primary.area_name || '')
          setPrimarySocietyName(primary.society_name || '')
        } else {
          setPrimaryLat(worker.latitude || null)
          setPrimaryLng(worker.longitude || null)
          setPrimaryCityName(worker.current_city || '')
          setPrimaryAreaName(worker.current_area || '')
        }
      })
    }

    // Load initial states list
    getStates().then(setStates)
  }, [worker])

  // Load initial states list for additional locations autocomplete
  useEffect(() => {
    getStates().then(setAddStatesList)
  }, [])

  // Load cities on state name match
  useEffect(() => {
    const st = addStatesList.find(s => s.name.toLowerCase() === (selLoc.stateName || '').toLowerCase())
    if (st) {
      getCities(st.id).then(setAddCitiesList)
    } else {
      setAddCitiesList([])
    }
  }, [selLoc.stateName, addStatesList])

  // Load areas on city name match
  useEffect(() => {
    const ct = addCitiesList.find(c => c.name.toLowerCase() === (selLoc.cityName || '').toLowerCase())
    if (ct) {
      getAreas(ct.id).then(setAddAreasList)
    } else {
      setAddAreasList([])
    }
  }, [selLoc.cityName, addCitiesList])

  // Smart Society Search Autocomplete for additional locations
  useEffect(() => {
    const ct = addCitiesList.find(c => c.name.toLowerCase() === (selLoc.cityName || '').toLowerCase())
    const cityId = ct ? ct.id : null
    const matchedArea = addAreasList.find(a => a.name.toLowerCase() === (selLoc.areaName || '').toLowerCase())
    const areaId = matchedArea ? matchedArea.id : null

    if (cityId) {
      if (selLoc.societyName && selLoc.societyName.length >= 2) {
        searchSocieties(selLoc.societyName, cityId).then(setAddSocietiesList)
      } else if (showAddSocietySuggestions) {
        let query = supabase
          .from('societies')
          .select('*, areas(name, city_id), cities(name)')
          .order('name', { ascending: true })
        
        if (areaId) {
          query = query.eq('area_id', areaId)
        } else {
          query = query.eq('city_id', cityId)
        }

        query.then(({ data, error }) => {
          if (!error && data) {
            setAddSocietiesList(data)
          } else {
            setAddSocietiesList([])
          }
        })
      } else {
        setAddSocietiesList([])
      }
    } else {
      setAddSocietiesList([])
    }
  }, [selLoc.societyName, selLoc.cityName, selLoc.areaName, addCitiesList, addAreasList, showAddSocietySuggestions])

  // Load primary cities on primary state change
  useEffect(() => {
    if (primaryStateId) {
      getCities(primaryStateId).then(setPrimaryCities)
    } else {
      setPrimaryCities([])
    }
  }, [primaryStateId])

  // Load primary areas on primary city change
  useEffect(() => {
    if (primaryCityId) {
      getAreas(primaryCityId).then(setPrimaryAreas)
    } else {
      setPrimaryAreas([])
    }
  }, [primaryCityId])

  const handlePrimaryLocationChange = async (coords) => {
    setPrimaryLat(coords.latitude)
    setPrimaryLng(coords.longitude)
    setPrimaryAddress(coords.address)
    
    try {
      const details = await getLocationDetails(coords.latitude, coords.longitude)
      if (details.state) {
        const resolvedState = await findOrCreateState(details.state)
        setPrimaryStateId(resolvedState.id)
        setPrimaryStateName(resolvedState.name)
        
        // Refresh states dropdown list
        const updatedStates = await getStates()
        setStates(updatedStates)
        
        if (details.city) {
          const resolvedCity = await findOrCreateCity(details.city, resolvedState.id)
          setPrimaryCityId(resolvedCity.id)
          setPrimaryCityName(resolvedCity.name)
          
          if (details.area) {
            const resolvedArea = await findOrCreateArea(details.area, resolvedCity.id)
            setPrimaryAreaId(resolvedArea.id)
            setPrimaryAreaName(resolvedArea.name)
          }
        }
      }
      setPrimarySocietyName(details.society || 'All Societies')
    } catch (err) {
      console.error('Error resolving coordinates:', err)
    }
  }

  const handlePrimaryStateChange = (e) => {
    const id = e.target.value
    setPrimaryStateId(id)
    const st = states.find(s => s.id === id)
    setPrimaryStateName(st ? st.name : '')
    setPrimaryCityId('')
    setPrimaryCityName('')
    setPrimaryAreaId('')
    setPrimaryAreaName('')
  }

  const handlePrimaryCityChange = (e) => {
    const id = e.target.value
    setPrimaryCityId(id)
    const ct = primaryCities.find(c => c.id === id)
    setPrimaryCityName(ct ? ct.name : '')
    setPrimaryAreaId('')
    setPrimaryAreaName('')
  }

  const handlePrimaryAreaChange = (e) => {
    const id = e.target.value
    setPrimaryAreaId(id)
    const ar = primaryAreas.find(a => a.id === id)
    setPrimaryAreaName(ar ? ar.name : '')
  }

  const selectAddState = (state) => {
    setSelLoc(prev => ({
      ...prev,
      stateName: state.name,
      cityName: '',
      areaName: '',
      societyName: '',
      latitude: null,
      longitude: null,
      address: ''
    }))
    setShowAddStateSuggestions(false)
  }

  const selectAddCity = (city) => {
    setSelLoc(prev => ({
      ...prev,
      cityName: city.name,
      areaName: '',
      societyName: '',
      latitude: null,
      longitude: null,
      address: ''
    }))
    setShowAddCitySuggestions(false)
  }

  const selectAddArea = (area) => {
    setSelLoc(prev => ({
      ...prev,
      areaName: area.name,
      societyName: '',
      latitude: null,
      longitude: null,
      address: ''
    }))
    setShowAddAreaSuggestions(false)
  }

  const selectAddSociety = (soc) => {
    setSelLoc(prev => ({
      ...prev,
      societyName: soc.name,
      latitude: soc.latitude || prev.latitude,
      longitude: soc.longitude || prev.longitude,
      address: soc.address || prev.address
    }))
    setShowAddSocietySuggestions(false)
  }

  const handleAdditionalLocationChange = async (coords) => {
    try {
      const details = await getLocationDetails(coords.latitude, coords.longitude)
      setSelLoc(prev => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: coords.address || details.address || '',
        stateName: details.state || prev.stateName,
        cityName: details.city || prev.cityName,
        areaName: details.area || prev.areaName,
        societyName: details.society || prev.societyName
      }))
    } catch (err) {
      console.error('Error resolving additional coordinates:', err)
    }
  }

  const handleDetectLocation = async () => {
    toast.loading('Detecting location...', { id: 'gps-profile' })
    try {
      const coords = await getCurrentPosition()
      const details = await getLocationDetails(coords.lat, coords.lng)
      
      setSelLoc({
        stateName: details.state || '',
        cityName: details.city || '',
        areaName: details.area || '',
        societyName: details.society || 'All Societies',
        latitude: coords.lat,
        longitude: coords.lng,
        address: details.address || ''
      })

      toast.success('Location auto-detected and filled!', { id: 'gps-profile' })
    } catch (err) {
      console.error(err)
      if (err.code === 1) {
        toast.error('Geolocation permission denied. Please allow location permissions in your browser settings.', { id: 'gps-profile' })
      } else {
        toast.error(err.message || 'Failed to detect location. Please select manually.', { id: 'gps-profile' })
      }
    }
  }

  const handleAddLocation = async () => {
    if (!selLoc.stateName || !selLoc.cityName || !selLoc.areaName) {
      toast.error('Please enter State, City and Area')
      return
    }

    // Coordinates are REQUIRED for custom society
    const isCustomSociety = selLoc.societyName && selLoc.societyName !== 'All Societies'
    if (isCustomSociety && (!selLoc.latitude || !selLoc.longitude)) {
      toast.error('Please pin the location of this society on the map to show real distance!')
      return
    }

    // Limit society selection count
    if (isCustomSociety) {
      const selectedSocietiesCount = locations.filter(loc => loc.society_name && loc.society_name !== 'All Societies').length
      if (selectedSocietiesCount >= maxSelectableSocieties) {
        toast.error(`Maximum selectable societies limit reached (${maxSelectableSocieties})`)
        return
      }
    }

    const toastId = toast.loading('Adding location...')
    try {
      // 1. Resolve State (find or create)
      const stateObj = await findOrCreateState(selLoc.stateName)
      
      // 2. Resolve City (find or create)
      const cityObj = await findOrCreateCity(selLoc.cityName, stateObj.id)
      
      // 3. Resolve Area (find or create)
      const areaObj = await findOrCreateArea(selLoc.areaName, cityObj.id)

      // 4. Resolve Society if custom
      let targetSocId = null
      let targetLat = selLoc.latitude || null
      let targetLng = selLoc.longitude || null

      if (isCustomSociety) {
        const resolvedSoc = await findOrCreateSociety({
          name: selLoc.societyName,
          areaId: areaObj.id,
          cityId: cityObj.id,
          latitude: targetLat,
          longitude: targetLng,
          address: selLoc.address || `${selLoc.societyName}, ${areaObj.name}, ${cityObj.name}`
        })
        targetSocId = resolvedSoc.id
        if (resolvedSoc.latitude) targetLat = resolvedSoc.latitude
        if (resolvedSoc.longitude) targetLng = resolvedSoc.longitude
      }

      // 5. Add Worker Location record
      const locObj = await addWorkerLocation(worker.id, {
        state_id: stateObj.id,
        city_id: cityObj.id,
        area_id: areaObj.id,
        state_name: stateObj.name,
        city_name: cityObj.name,
        area_name: areaObj.name,
        society_name: selLoc.societyName || 'All Societies',
        society_id: targetSocId || null,
        latitude: targetLat || null,
        longitude: targetLng || null
      })

      setLocations([...locations, locObj])
      setSelLoc({
        stateName: '',
        cityName: '',
        areaName: '',
        societyName: '',
        latitude: null,
        longitude: null,
        address: ''
      })
      toast.success('Work Location added!', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Failed to add location: ' + (err.message || err), { id: toastId })
    }
  }

  const handleRemoveLocation = async (id) => {
    try {
      await removeWorkerLocation(id)
      setLocations(locations.filter(l => l.id !== id))
      toast.success('Location removed')
    } catch (err) {
      toast.error('Failed to delete location')
    }
  }

  const handleAddLanguage = () => {
    if (newLanguage && !languages.includes(newLanguage)) {
      setLanguages([...languages, newLanguage])
      setNewLanguage('')
    }
  }

  const handleRemoveLanguage = (lang) => {
    setLanguages(languages.filter(l => l !== lang))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    
    // Validate selfie requirement
    if (!worker?.selfie_url && !selfieFile) {
      toast.error('Selfie photo is required!')
      return
    }

    setSaving(true)
    try {
      // 1. Upload photo if present
      if (avatarFile) {
        await uploadWorkerPhoto(worker.id, avatarFile)
      }

      // Upload selfie if present
      if (selfieFile) {
        await uploadWorkerSelfie(worker.id, selfieFile)
      }
      
      // 2. Upload UPI QR if present
      if (upiFile) {
        await uploadUpiQr(worker.id, upiFile)
      }

      // 3. Update main profile details in Supabase
      const { error: userErr } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user.id)
      if (userErr) throw userErr

      await supabase
        .from('workers')
        .update({
          full_name: fullName,
          bio,
          experience_years: Number(experience),
          pricing_per_hour: Number(pricingPerHour),
          pricing_per_day: Number(pricingPerDay),
          pricing_note: pricingNote,
          phone2,
          languages,
          travel_radius: Number(travelRadius),
          latitude: primaryLat,
          longitude: primaryLng,
          current_city: primaryCityName || null,
          current_area: primaryAreaName || null,
          last_location_update: new Date().toISOString()
        })
        .eq('id', worker.id)

      // 3.5 Find or create the primary society if it's a specific society name
      let registeredSocietyId = null
      if (primarySocietyName && primarySocietyName !== 'All Societies' && primaryStateId && primaryCityId && primaryAreaId) {
        try {
          const resolvedSoc = await findOrCreateSociety({
            name: primarySocietyName,
            areaId: primaryAreaId,
            cityId: primaryCityId,
            latitude: primaryLat,
            longitude: primaryLng,
            address: primaryAddress || `${primarySocietyName}, ${primaryAreaName}, ${primaryCityName}`
          })
          registeredSocietyId = resolvedSoc.id
        } catch (socErr) {
          console.error('Failed to register/find primary society:', socErr)
        }
      }

      // 4. Update/Upsert primary location entry in worker_locations table
      const primaryLoc = locations.find(l => l.is_primary)
      if (primaryLoc) {
        const { error: updateLocErr } = await supabase
          .from('worker_locations')
          .update({
            state_id: primaryStateId || null,
            city_id: primaryCityId || null,
            area_id: primaryAreaId || null,
            state_name: primaryStateName || null,
            city_name: primaryCityName || null,
            area_name: primaryAreaName || null,
            society_name: primarySocietyName || 'All Societies',
            society_id: registeredSocietyId || null,
            latitude: primaryLat || null,
            longitude: primaryLng || null
          })
          .eq('id', primaryLoc.id)
        if (updateLocErr) throw updateLocErr
      } else {
        const { error: insertLocErr } = await supabase
          .from('worker_locations')
          .insert([{
            worker_id: worker.id,
            state_id: primaryStateId || null,
            city_id: primaryCityId || null,
            area_id: primaryAreaId || null,
            state_name: primaryStateName || null,
            city_name: primaryCityName || null,
            area_name: primaryAreaName || null,
            society_name: primarySocietyName || 'All Societies',
            society_id: registeredSocietyId || null,
            latitude: primaryLat || null,
            longitude: primaryLng || null,
            is_primary: true
          }])
        if (insertLocErr) throw insertLocErr
      }

      toast.success('Profile updated successfully!')
      await refreshProfile()
      navigate('/worker/profile')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <WorkerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ width: 'fit-content', gap: '4px' }}>
          <ArrowLeft size={16} /> Cancel
        </button>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Edit Profile Settings</h2>

        <form onSubmit={handleSaveProfile} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Profile, Selfie & UPI Upload blocks */}
          <div className="grid-3">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Profile Avatar Image</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '4px' }}>
                  <FileUp size={14} /> Upload Avatar
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setAvatarFile(e.target.files[0])} />
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {avatarFile ? avatarFile.name : 'No file chosen'}
                </span>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Selfie Image <span style={{ color: 'var(--danger)' }}>*Required</span></label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '4px' }}>
                  <FileUp size={14} /> Upload Selfie
                  <input type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={e => setSelfieFile(e.target.files[0])} />
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {selfieFile ? selfieFile.name : 'No file chosen'}
                </span>
              </div>
              {worker?.selfie_url && (
                <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px' }}>
                  ✓ Selfie already uploaded
                </div>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">UPI QR Scanner Image</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '4px' }}>
                  <QrCode size={14} /> Upload UPI QR Code
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setUpiFile(e.target.files[0])} />
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {upiFile ? upiFile.name : 'No file chosen'}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Backup Phone Number</label>
              <input type="tel" className="form-input" value={phone2} onChange={e => setPhone2(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Experience Years</label>
              <input type="number" className="form-input" value={experience} onChange={e => setExperience(e.target.value)} required />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Biography</label>
            <textarea className="form-input" rows={3} value={bio} onChange={e => setBio(e.target.value)} required />
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Hourly Pricing (₹)</label>
              <input type="number" className="form-input" value={pricingPerHour} onChange={e => setPricingPerHour(e.target.value)} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Daily Pricing (₹)</label>
              <input type="number" className="form-input" value={pricingPerDay} onChange={e => setPricingPerDay(e.target.value)} required />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Pricing Notes</label>
              <input type="text" className="form-input" value={pricingNote} onChange={e => setPricingNote(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Service Travel Distance Limit (Radius)</label>
              <select className="form-select" value={travelRadius} onChange={e => setTravelRadius(Number(e.target.value))}>
                <option value={3}>3 km</option>
                <option value={5}>5 km</option>
                <option value={8}>8 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
                <option value={20}>20 km</option>
              </select>
            </div>
          </div>

          {/* Languages input section */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Languages Spoken</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" className="form-input" placeholder="Add Language..." value={newLanguage} onChange={e => setNewLanguage(e.target.value)} />
              <button type="button" onClick={handleAddLanguage} className="btn btn-secondary">Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.5rem' }}>
              {languages.map(l => (
                <span key={l} className="badge badge-verified" style={{ textTransform: 'none', cursor: 'pointer' }} onClick={() => handleRemoveLanguage(l)}>
                  {l} ✕
                </span>
              ))}
            </div>
          </div>

          {/* Primary Location (Map & Details) */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Primary Base Location</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Set your primary address location. You can pin it on the map or select it manually below.
            </p>

            <div className="grid-3" style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>State</label>
                <select className="form-select" value={primaryStateId} onChange={handlePrimaryStateChange}>
                  <option value="">Select State</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>City</label>
                <select className="form-select" value={primaryCityId} disabled={!primaryStateId} onChange={handlePrimaryCityChange}>
                  <option value="">Select City</option>
                  {primaryCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Area</label>
                <select className="form-select" value={primaryAreaId} disabled={!primaryCityId} onChange={handlePrimaryAreaChange}>
                  <option value="">Select Area</option>
                  {primaryAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Society Name / Landmark</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Setu Vartica" 
                value={primarySocietyName} 
                onChange={e => setPrimarySocietyName(e.target.value)} 
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Pin Base Location on Map</label>
              <LocationPicker 
                lat={primaryLat} 
                lng={primaryLng} 
                onLocationChange={handlePrimaryLocationChange} 
              />
            </div>
          </div>

          {/* Location matrix list adding manager */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Manage Additional Work Locations</h4>
              <button 
                type="button" 
                onClick={handleDetectLocation} 
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px' }}
              >
                <Navigation size={12} /> Detect Current Location
              </button>
            </div>

            <div className="grid-3" style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', gap: '1rem' }}>
              {/* State input */}
              <div style={{ position: 'relative' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>State</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Type State"
                  value={selLoc.stateName}
                  onChange={e => setSelLoc({ ...selLoc, stateName: e.target.value, cityName: '', areaName: '', societyName: '' })}
                  onFocus={() => setShowAddStateSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAddStateSuggestions(false), 200)}
                  autoComplete="off"
                  style={{ height: '38px', fontSize: '13px' }}
                />
                {showAddStateSuggestions && addStatesList.filter(s => s.name.toLowerCase().includes((selLoc.stateName || '').toLowerCase())).length > 0 && (
                  <ul className="glass" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px',
                    maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px'
                  }}>
                    {addStatesList.filter(s => s.name.toLowerCase().includes((selLoc.stateName || '').toLowerCase())).map(s => (
                      <li 
                        key={s.id} 
                        onClick={() => selectAddState(s)} 
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' }} 
                        className="glass-hover"
                      >
                        {s.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* City input */}
              <div style={{ position: 'relative' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>City</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Type City"
                  value={selLoc.cityName}
                  onChange={e => setSelLoc({ ...selLoc, cityName: e.target.value, areaName: '', societyName: '' })}
                  onFocus={() => setShowAddCitySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAddCitySuggestions(false), 200)}
                  autoComplete="off"
                  disabled={!selLoc.stateName}
                  style={{ height: '38px', fontSize: '13px' }}
                />
                {showAddCitySuggestions && addCitiesList.filter(c => c.name.toLowerCase().includes((selLoc.cityName || '').toLowerCase())).length > 0 && (
                  <ul className="glass" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px',
                    maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px'
                  }}>
                    {addCitiesList.filter(c => c.name.toLowerCase().includes((selLoc.cityName || '').toLowerCase())).map(c => (
                      <li 
                        key={c.id} 
                        onClick={() => selectAddCity(c)} 
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' }} 
                        className="glass-hover"
                      >
                        {c.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Area input */}
              <div style={{ position: 'relative' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Area</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Type Area"
                  value={selLoc.areaName}
                  onChange={e => setSelLoc({ ...selLoc, areaName: e.target.value, societyName: '' })}
                  onFocus={() => setShowAddAreaSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAddAreaSuggestions(false), 200)}
                  autoComplete="off"
                  disabled={!selLoc.cityName}
                  style={{ height: '38px', fontSize: '13px' }}
                />
                {showAddAreaSuggestions && addAreasList.filter(a => a.name.toLowerCase().includes((selLoc.areaName || '').toLowerCase())).length > 0 && (
                  <ul className="glass" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px',
                    maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px'
                  }}>
                    {addAreasList.filter(a => a.name.toLowerCase().includes((selLoc.areaName || '').toLowerCase())).map(a => (
                      <li 
                        key={a.id} 
                        onClick={() => selectAddArea(a)} 
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' }} 
                        className="glass-hover"
                      >
                        {a.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="form-group" style={{ margin: 0, position: 'relative' }}>
              <label className="form-label">Society Name (Optional - leave blank for all areas)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={selLoc.cityName ? "e.g. Green Park Residency" : "Select/Type City first"}
                  disabled={!selLoc.cityName}
                  value={selLoc.societyName}
                  onChange={e => setSelLoc({ ...selLoc, societyName: e.target.value })}
                  onFocus={() => setShowAddSocietySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAddSocietySuggestions(false), 200)}
                  autoComplete="off"
                />
                {showAddSocietySuggestions && addSocietiesList.length > 0 && (
                  <ul className="glass" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px',
                    maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px'
                  }}>
                    {addSocietiesList.map(soc => (
                      <li 
                        key={soc.id} 
                        onClick={() => selectAddSociety(soc)} 
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' }} 
                        className="glass-hover"
                      >
                        {soc.name} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({soc.cities?.name || ''})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Dedicated LocationPicker for Pinning Additional Work Areas */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Pin Additional Location on Map</span>
                <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 600 }}>* REQUIRED FOR CUSTOM SOCIETY</span>
              </label>
              <LocationPicker 
                lat={selLoc.latitude} 
                lng={selLoc.longitude} 
                onLocationChange={handleAdditionalLocationChange} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button 
                type="button" 
                onClick={handleAddLocation} 
                className="btn btn-primary" 
                style={{ gap: '6px', padding: '8px 16px', fontSize: '13px' }}
              >
                <Plus size={16} /> Add Work Location
              </button>
            </div>

            {/* Configured locations list */}
            <div className="card glass" style={{ padding: '0.75rem' }}>
              {locations.filter(l => !l.is_primary).length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '0.5rem' }}>No locations added yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {locations.filter(l => !l.is_primary).map(loc => (
                    <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                      <span>{loc.city_name} → {loc.area_name} ({loc.society_name})</span>
                      <button type="button" onClick={() => handleRemoveLocation(loc.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={saving}>
            {saving ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Save Profile Details'}
          </button>
        </form>
      </div>
    </WorkerLayout>
  )
}
