import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { Settings, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function SystemSettings() {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    supabase
      .from('system_settings')
      .select('*')
      .then(({ data }) => setSettings(data || []))
      .finally(() => setLoading(false))
  }, [])

  const handleUpdateSetting = async (key, nextVal) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value: nextVal } : s))
  }

  const handleSaveAll = async (e) => {
    e.preventDefault()
    setUpdating(true)
    try {
      for (const item of settings) {
        await supabase
          .from('system_settings')
          .update({ value: item.value })
          .eq('key', item.key)
      }
      toast.success('System configurations updated!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Global System Configuration</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Modify global thresholds, app parameters, and offline payment UPI addresses
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <form onSubmit={handleSaveAll} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {settings.map(s => (
              <div key={s.id} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                  {s.key.replace(/_/g, ' ')}
                </label>
                
                <input 
                  type="text" 
                  className="form-input" 
                  value={s.value || ''} 
                  onChange={e => handleUpdateSetting(s.key, e.target.value)} 
                />
                
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  {s.description}
                </span>
              </div>
            ))}

            <button type="submit" className="btn btn-primary" style={{ gap: '6px', alignSelf: 'flex-start' }} disabled={updating}>
              {updating ? 'Saving...' : <><Save size={16} /> Save Configurations</>}
            </button>
          </form>
        )}

      </div>
    </AdminLayout>
  )
}
