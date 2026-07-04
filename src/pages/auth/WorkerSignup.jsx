import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sparkles, MapPin, Plus, Trash2 } from 'lucide-react'
import { workerSignupSchema } from '../../utils/validators'
import { signUp, createWorkerProfile, getRoles } from '../../services/auth'
import { getStates, getCities, getAreas, searchSocieties } from '../../services/locations'
import { toast } from 'react-hot-toast'

export default function WorkerSignup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Location selector helper states
  const [statesList, setStatesList] = useState([])
  const [citiesList, setCitiesList] = useState([])
  const [areasList, setAreasList] = useState([])
  
  // Work Locations adding system
  const [locations, setLocations] = useState([])
  const [currentLoc, setCurrentLoc] = useState({
    stateId: '', cityId: '', areaId: '', societyId: '',
    stateName: '', cityName: '', areaName: '', societyName: ''
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    trigger
  } = useForm({
    resolver: zodResolver(workerSignupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      phone2: '',
      password: '',
      confirmPassword: '',
      gender: 'male',
      dob: '',
      bio: '',
      experienceYears: 1,
      languages: [],
      workerType: 'home_cleaning',
      pricingPerHour: 150,
      pricingPerDay: 800,
      pricingNote: ''
    }
  })

  // Watch fields
  const watchLanguages = watch('languages')
  const watchWorkerType = watch('workerType')

  useEffect(() => {
    getStates().then(setStatesList).catch(err => console.error('Error fetching states:', err))
  }, [])

  // Load cities when current location state selection changes
  useEffect(() => {
    if (currentLoc.stateId) {
      getCities(currentLoc.stateId).then(setCitiesList)
    }
  }, [currentLoc.stateId])

  // Load areas when city changes
  useEffect(() => {
    if (currentLoc.cityId) {
      getAreas(currentLoc.cityId).then(setAreasList)
    }
  }, [currentLoc.cityId])

  const addLocationRow = () => {
    if (!currentLoc.stateId || !currentLoc.cityId || !currentLoc.areaId) {
      toast.error('Select State, City and Area to add location')
      return
    }

    const stateObj = statesList.find(s => s.id === currentLoc.stateId)
    const cityObj = citiesList.find(c => c.id === currentLoc.cityId)
    const areaObj = areasList.find(a => a.id === currentLoc.areaId)

    const newLoc = {
      stateId: currentLoc.stateId,
      cityId: currentLoc.cityId,
      areaId: currentLoc.areaId,
      societyId: currentLoc.societyId || null,
      stateName: stateObj?.name || '',
      cityName: cityObj?.name || '',
      areaName: areaObj?.name || '',
      societyName: currentLoc.societyName || 'All Societies'
    }

    setLocations([...locations, newLoc])
    // Reset location adding state
    setCurrentLoc({
      stateId: '', cityId: '', areaId: '', societyId: '',
      stateName: '', cityName: '', areaName: '', societyName: ''
    })
    toast.success('Work Location added!')
  }

  const removeLocationRow = (index) => {
    setLocations(locations.filter((_, idx) => idx !== index))
  }

  const handleLanguageAdd = (lang) => {
    const list = watchLanguages || []
    if (lang && !list.includes(lang)) {
      setValue('languages', [...list, lang])
    }
  }

  const handleLanguageRemove = (lang) => {
    const list = watchLanguages || []
    setValue('languages', list.filter(l => l !== lang))
  }

  const handleNext = async () => {
    let fieldsToValidate = []
    if (step === 1) {
      fieldsToValidate = ['fullName', 'email', 'phone', 'phone2', 'password', 'confirmPassword', 'gender', 'dob']
    } else if (step === 2) {
      fieldsToValidate = ['bio', 'experienceYears', 'languages', 'workerType', 'pricingPerHour', 'pricingPerDay']
    }
    
    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      if (step === 2 && locations.length === 0) {
        // Automatically proceed to location input step
        setStep(3)
      } else {
        setStep(prev => prev + 1)
      }
    } else {
      toast.error('Please correct errors in form fields')
    }
  }

  const onSubmit = async (data) => {
    if (locations.length === 0) {
      toast.error('Please add at least one Work Location (City/Area)')
      return
    }

    setLoading(true)
    try {
      // 1. Get role ID for worker
      const roles = await getRoles()
      const workerRole = roles.find(r => r.name === 'worker')
      if (!workerRole) throw new Error('Role "worker" not configured in database')

      // Create fallback email if blank
      const authEmail = data.email || `${data.phone}@cleanconnect.com`

      // 2. Sign up Auth User
      const authResult = await signUp(authEmail, data.password, data.fullName)
      const userId = authResult.user.id

      // 3. Create Worker Profile with primary locations list
      await createWorkerProfile(userId, workerRole.id, {
        ...data,
        locations
      })

      // Store worker profile credentials locally before proceeding to doc uploads
      localStorage.setItem('cleanconnect_signup_worker_id', userId)

      toast.success('Account created! Proceed to document uploads.')
      navigate('/auth/documents')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Registration failed. Check details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', alignItems: 'center', justify: 'center', padding: '1.5rem' }}>
      <div className="card glass slide-up" style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Step indicator header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="var(--primary)" />
            <span style={{ fontSize: '14px', fontWeight: 700 }}>Worker Professional Account Registration</span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
            Step {step} of 3
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* STEP 1: Personal Credentials & DOB */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.0rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" placeholder="Ramesh Kumar" {...register('fullName')} />
                {errors.fullName && <span className="form-error">{errors.fullName.message}</span>}
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Primary Phone (UPI/Call)</label>
                  <input type="tel" className="form-input" placeholder="9876543210" {...register('phone')} />
                  {errors.phone && <span className="form-error">{errors.phone.message}</span>}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Secondary / Backup Phone</label>
                  <input type="tel" className="form-input" placeholder="9123456789" {...register('phone2')} />
                  {errors.phone2 && <span className="form-error">{errors.phone2.message}</span>}
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address (Optional)</label>
                <input type="email" className="form-input" placeholder="ramesh@example.com" {...register('email')} />
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Gender</label>
                  <select className="form-select" {...register('gender')}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className="form-input" {...register('dob')} />
                  {errors.dob && <span className="form-error">{errors.dob.message}</span>}
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Password</label>
                  <input type="password" className="form-input" placeholder="••••••••" {...register('password')} />
                  {errors.password && <span className="form-error">{errors.password.message}</span>}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Confirm Password</label>
                  <input type="password" className="form-input" placeholder="••••••••" {...register('confirmPassword')} />
                  {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Work preferences and Rates */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Introduce Yourself (Bio)</label>
                <textarea 
                  className="form-input" 
                  rows={3} 
                  placeholder="Tell homeowners about your cleaning experience..." 
                  {...register('bio')}
                />
                {errors.bio && <span className="form-error">{errors.bio.message}</span>}
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Years of Experience</label>
                  <input type="number" className="form-input" {...register('experienceYears', { valueAsNumber: true })} />
                  {errors.experienceYears && <span className="form-error">{errors.experienceYears.message}</span>}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Worker Type</label>
                  <select className="form-select" {...register('workerType')}>
                    <option value="home_cleaning">Home Cleaning Only</option>
                    <option value="office_cleaning">Office Cleaning Only</option>
                    <option value="both">Both (Home & Office)</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Pricing Rate Per Hour (₹)</label>
                  <input type="number" className="form-input" {...register('pricingPerHour', { valueAsNumber: true })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Pricing Rate Per Day (₹)</label>
                  <input type="number" className="form-input" {...register('pricingPerDay', { valueAsNumber: true })} />
                </div>
              </div>

              {/* Languages tags input */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Languages Spoken</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {['Hindi', 'English', 'Punjabi', 'Gujarati', 'Marathi', 'Bengali', 'Tamil', 'Telugu'].map(l => (
                    <button 
                      key={l} 
                      type="button" 
                      onClick={() => handleLanguageAdd(l)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}
                    >
                      +{l}
                    </button>
                  ))}
                </div>
                
                {/* Active languages display list */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(watchLanguages || []).map(lang => (
                    <span 
                      key={lang} 
                      className="badge badge-verified" 
                      style={{ textTransform: 'none', cursor: 'pointer' }}
                      onClick={() => handleLanguageRemove(lang)}
                    >
                      {lang} ✕
                    </span>
                  ))}
                </div>
                {errors.languages && <span className="form-error">{errors.languages.message}</span>}
              </div>
            </div>
          )}

          {/* STEP 3: Multi Work-locations configuration */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Configure Work Locations</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Select multiple cities, areas or societies. Unlimited target locations allowed.
              </p>

              {/* Selector Row */}
              <div className="grid-3" style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">State</label>
                  <select 
                    className="form-select"
                    value={currentLoc.stateId}
                    onChange={(e) => setCurrentLoc({ ...currentLoc, stateId: e.target.value })}
                  >
                    <option value="">Select State</option>
                    {statesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">City</label>
                  <select 
                    className="form-select"
                    value={currentLoc.cityId}
                    disabled={!currentLoc.stateId}
                    onChange={(e) => setCurrentLoc({ ...currentLoc, cityId: e.target.value })}
                  >
                    <option value="">Select City</option>
                    {citiesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Area</label>
                  <select 
                    className="form-select"
                    value={currentLoc.areaId}
                    disabled={!currentLoc.cityId}
                    onChange={(e) => setCurrentLoc({ ...currentLoc, areaId: e.target.value })}
                  >
                    <option value="">Select Area</option>
                    {areasList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label className="form-label">Society Name (Optional - leave blank for all areas)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Green Park Residency"
                    value={currentLoc.societyName}
                    onChange={(e) => setCurrentLoc({ ...currentLoc, societyName: e.target.value })}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={addLocationRow} 
                  className="btn btn-primary"
                  style={{ gap: '4px', height: '44px' }}
                >
                  <Plus size={16} /> Add
                </button>
              </div>

              {/* Added Locations list table */}
              <div className="card glass" style={{ padding: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                {locations.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '1rem', fontSize: '13px', color: 'var(--text-muted)' }}>
                    No work locations added yet. Please select above and click Add.
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>City</th>
                        <th style={{ padding: '8px' }}>Area</th>
                        <th style={{ padding: '8px' }}>Society</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((loc, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '8px' }}>{loc.cityName}</td>
                          <td style={{ padding: '8px' }}>{loc.areaName}</td>
                          <td style={{ padding: '8px' }}>{loc.societyName}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <button 
                              type="button" 
                              onClick={() => removeLocationRow(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Navigation controls */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            {step > 1 && (
              <button type="button" onClick={() => setStep(prev => prev - 1)} className="btn btn-secondary" style={{ flex: 1 }}>
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button type="button" onClick={handleNext} className="btn btn-primary" style={{ flex: 1 }}>
                Continue
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Register & Upload Docs'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  )
}
