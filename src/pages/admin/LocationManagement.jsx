import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { Plus, Trash2, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function LocationManagement() {
  const [activeTab, setActiveTab] = useState('societies')
  const [loading, setLoading] = useState(true)

  // Lists
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [areas, setAreas] = useState([])
  const [societies, setSocieties] = useState([])

  // Form states
  const [newStateName, setNewStateName] = useState('')
  
  const [selStateId, setSelStateId] = useState('')
  const [newCityName, setNewCityName] = useState('')

  const [selCityId, setSelCityId] = useState('')
  const [newAreaName, setNewAreaName] = useState('')

  const [selAreaId, setSelAreaId] = useState('')
  const [newSocietyName, setNewSocietyName] = useState('')
  const [societyLat, setSocietyLat] = useState('')
  const [societyLng, setSocietyLng] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: st } = await supabase.from('states').select('*').order('name')
      const { data: ct } = await supabase.from('cities').select('*, states(name)').order('name')
      const { data: ar } = await supabase.from('areas').select('*, cities(name)').order('name')
      const { data: sc } = await supabase.from('societies').select('*, areas(name), cities(name)').order('name')

      setStates(st || [])
      setCities(ct || [])
      setAreas(ar || [])
      setSocieties(sc || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddState = async (e) => {
    e.preventDefault()
    if (!newStateName.trim()) return
    
    // Check duplicate
    if (states.some(s => s.name.toLowerCase() === newStateName.trim().toLowerCase())) {
      toast.error('State already exists')
      return
    }

    try {
      const { data, error } = await supabase
        .from('states')
        .insert([{ name: newStateName.trim() }])
        .select()
        .single()

      if (error) throw error
      setStates([...states, data])
      setNewStateName('')
      toast.success('State added!')
    } catch (err) {
      toast.error('Failed to create state')
    }
  }

  const handleAddCity = async (e) => {
    e.preventDefault()
    if (!selStateId || !newCityName.trim()) return

    if (cities.some(c => c.name.toLowerCase() === newCityName.trim().toLowerCase() && c.state_id === selStateId)) {
      toast.error('City already exists in selected state')
      return
    }

    try {
      const { data, error } = await supabase
        .from('cities')
        .insert([{ state_id: selStateId, name: newCityName.trim() }])
        .select('*, states(name)')
        .single()

      if (error) throw error
      setCities([...cities, data])
      setNewCityName('')
      toast.success('City added!')
    } catch (err) {
      toast.error('Failed to create city')
    }
  }

  const handleAddArea = async (e) => {
    e.preventDefault()
    if (!selCityId || !newAreaName.trim()) return

    if (areas.some(a => a.name.toLowerCase() === newAreaName.trim().toLowerCase() && a.city_id === selCityId)) {
      toast.error('Area already exists in selected city')
      return
    }

    try {
      const { data, error } = await supabase
        .from('areas')
        .insert([{ city_id: selCityId, name: newAreaName.trim() }])
        .select('*, cities(name)')
        .single()

      if (error) throw error
      setAreas([...areas, data])
      setNewAreaName('')
      toast.success('Area added!')
    } catch (err) {
      toast.error('Failed to create area')
    }
  }

  const handleAddSociety = async (e) => {
    e.preventDefault()
    if (!selAreaId || !newSocietyName.trim()) return

    // Get city id from area selection
    const matchedArea = areas.find(a => a.id === selAreaId)
    const targetCityId = matchedArea?.city_id

    if (societies.some(s => s.name.toLowerCase() === newSocietyName.trim().toLowerCase() && s.city_id === targetCityId)) {
      toast.error('Society already registered in this city')
      return
    }

    try {
      const { data, error } = await supabase
        .from('societies')
        .insert([{
          area_id: selAreaId,
          city_id: targetCityId,
          name: newSocietyName.trim(),
          latitude: parseFloat(societyLat) || null,
          longitude: parseFloat(societyLng) || null
        }])
        .select('*, areas(name), cities(name)')
        .single()

      if (error) throw error
      setSocieties([...societies, data])
      setNewSocietyName('')
      setSocietyLat('')
      setSocietyLng('')
      toast.success('Society added!')
    } catch (err) {
      toast.error('Failed to create society')
    }
  }

  const handleDelete = async (table, id) => {
    const confirm = window.confirm(`Are you sure you want to delete this ${table} entry?`)
    if (!confirm) return

    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      toast.success('Item deleted successfully')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete item')
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Geo-Locations Configuration</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage states, cities, areas and smart societies database to prevent duplicates
          </p>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          {['societies', 'areas', 'cities', 'states'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className="btn btn-ghost btn-sm"
              style={{ 
                textTransform: 'capitalize',
                background: activeTab === tab ? 'var(--primary-light)' : 'transparent',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid-2">
            
            {/* List Tab Card */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'capitalize' }}>Registered {activeTab}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeTab === 'states' && states.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>{s.name}</span>
                    <button onClick={() => handleDelete('states', s.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {activeTab === 'cities' && cities.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>{c.name} <small style={{ color: 'var(--text-muted)' }}>({c.states?.name})</small></span>
                    <button onClick={() => handleDelete('cities', c.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {activeTab === 'areas' && areas.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>{a.name} <small style={{ color: 'var(--text-muted)' }}>({a.cities?.name})</small></span>
                    <button onClick={() => handleDelete('areas', a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {activeTab === 'societies' && societies.map(sc => (
                  <div key={sc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                    <div>
                      <div>{sc.name}</div>
                      <small style={{ color: 'var(--text-muted)' }}>{sc.cities?.name} → {sc.areas?.name}</small>
                    </div>
                    <button onClick={() => handleDelete('societies', sc.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Forms Card */}
            <div className="card glass">
              
              {activeTab === 'states' && (
                <form onSubmit={handleAddState} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add State</h3>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">State Name</label>
                    <input type="text" className="form-input" value={newStateName} onChange={e => setNewStateName(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ gap: '4px' }}>
                    <Plus size={14} /> Create State
                  </button>
                </form>
              )}

              {activeTab === 'cities' && (
                <form onSubmit={handleAddCity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add City</h3>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select State</label>
                    <select className="form-select" value={selStateId} onChange={e => setSelStateId(e.target.value)} required>
                      <option value="">Choose State</option>
                      {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">City Name</label>
                    <input type="text" className="form-input" value={newCityName} onChange={e => setNewCityName(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ gap: '4px' }}>
                    <Plus size={14} /> Create City
                  </button>
                </form>
              )}

              {activeTab === 'areas' && (
                <form onSubmit={handleAddArea} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add Area</h3>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select City</label>
                    <select className="form-select" value={selCityId} onChange={e => setSelCityId(e.target.value)} required>
                      <option value="">Choose City</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Area Name</label>
                    <input type="text" className="form-input" value={newAreaName} onChange={e => setNewAreaName(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ gap: '4px' }}>
                    <Plus size={14} /> Create Area
                  </button>
                </form>
              )}

              {activeTab === 'societies' && (
                <form onSubmit={handleAddSociety} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add Smart Society</h3>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select Area</label>
                    <select className="form-select" value={selAreaId} onChange={e => setSelAreaId(e.target.value)} required>
                      <option value="">Choose Area</option>
                      {areas.map(a => <option key={a.id} value={a.id}>{a.name} ({a.cities?.name})</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Society Name</label>
                    <input type="text" className="form-input" value={newSocietyName} onChange={e => setNewSocietyName(e.target.value)} required />
                  </div>
                  <div className="grid-2">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Latitude</label>
                      <input type="number" step="any" className="form-input" placeholder="28.1234" value={societyLat} onChange={e => setSocietyLat(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Longitude</label>
                      <input type="number" step="any" className="form-input" placeholder="77.1234" value={societyLng} onChange={e => setSocietyLng(e.target.value)} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ gap: '4px' }}>
                    <Plus size={14} /> Create Society
                  </button>
                </form>
              )}

            </div>

          </div>
        )}

      </div>
    </AdminLayout>
  )
}
