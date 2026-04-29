import React, { useEffect, useMemo, useState } from 'react'
import SearchableSelect from './SearchableSelect'

const API = 'https://provinces.open-api.vn/api'

const byName = (a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'vi')

export default function VnAddressSelect({ city, district, ward, cityCode, districtCode: districtCodeProp, wardCode: wardCodeProp, onChange }) {
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [wards, setWards] = useState([])

  const [provinceCode, setProvinceCode] = useState('')
  const [districtCode, setDistrictCode] = useState('')
  const [wardCode, setWardCode] = useState('')

  useEffect(() => {
    fetch(`${API}/?depth=1`)
      .then((r) => r.json())
      .then((list) => setProvinces(Array.isArray(list) ? list.sort(byName) : []))
      .catch(() => setProvinces([]))
  }, [])

  const provinceByName = useMemo(() => {
    const map = new Map()
    provinces.forEach((p) => map.set(String(p.name || '').toLowerCase(), p))
    return map
  }, [provinces])

  // Ưu tiên set theo code (nếu có) để prefill chính xác
  useEffect(() => {
    if (!cityCode || provinceCode) return
    setProvinceCode(String(cityCode))
  }, [cityCode, provinceCode])

  // Nếu đã có city string từ profile => cố gắng map sang code
  useEffect(() => {
    if (!city || provinceCode) return
    const p = provinceByName.get(String(city).toLowerCase())
    if (p?.code) setProvinceCode(String(p.code))
  }, [city, provinceCode, provinceByName])

  useEffect(() => {
    if (!provinceCode) {
      setDistricts([])
      setWards([])
      setDistrictCode('')
      setWardCode('')
      return
    }
    fetch(`${API}/p/${provinceCode}?depth=2`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.districts) ? data.districts.sort(byName) : []
        setDistricts(list)
      })
      .catch(() => setDistricts([]))
  }, [provinceCode])

  const districtByName = useMemo(() => {
    const map = new Map()
    districts.forEach((d) => map.set(String(d.name || '').toLowerCase(), d))
    return map
  }, [districts])

  useEffect(() => {
    if (!districtCodeProp || districtCode) return
    setDistrictCode(String(districtCodeProp))
  }, [districtCodeProp, districtCode])

  useEffect(() => {
    if (!district || districtCode) return
    const d = districtByName.get(String(district).toLowerCase())
    if (d?.code) setDistrictCode(String(d.code))
  }, [district, districtCode, districtByName])

  useEffect(() => {
    if (!districtCode) {
      setWards([])
      setWardCode('')
      return
    }
    fetch(`${API}/d/${districtCode}?depth=2`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.wards) ? data.wards.sort(byName) : []
        setWards(list)
      })
      .catch(() => setWards([]))
  }, [districtCode])

  // Nếu đã có ward name từ profile => map sang wardCode
  useEffect(() => {
    if (!ward || wardCode || !wards.length) return
    const w = wards.find((x) => String(x.name || '').toLowerCase() === String(ward).toLowerCase())
    if (w?.code) setWardCode(String(w.code))
  }, [ward, wardCode, wards])

  useEffect(() => {
    if (!wardCodeProp || wardCode) return
    setWardCode(String(wardCodeProp))
  }, [wardCodeProp, wardCode])

  return (
    <>
      <div className="form-group">
        <SearchableSelect
          label="Tỉnh/Thành phố"
          required
          placeholder="Gõ để tìm tỉnh/thành..."
          value={provinceCode}
          options={provinces.map((p) => ({ value: String(p.code), label: p.name }))}
          onChange={(val) => {
            const code = String(val || '')
            setProvinceCode(code)
            setDistrictCode('')
            setWardCode('')
            const p = provinces.find((x) => String(x.code) === code)
            onChange?.({
              cityCode: String(p?.code || ''),
              cityName: p?.name || '',
              districtCode: '',
              districtName: '',
              wardCode: '',
              wardName: ''
            })
          }}
        />
      </div>

      <div className="form-group">
        <SearchableSelect
          label="Quận/Huyện"
          required
          placeholder={provinceCode ? 'Gõ để tìm quận/huyện...' : 'Chọn tỉnh/thành trước'}
          value={districtCode}
          disabled={!provinceCode}
          options={districts.map((d) => ({ value: String(d.code), label: d.name }))}
          onChange={(val) => {
            const code = String(val || '')
            setDistrictCode(code)
            setWardCode('')
            const d = districts.find((x) => String(x.code) === code)
            onChange?.({
              districtCode: String(d?.code || ''),
              districtName: d?.name || '',
              wardCode: '',
              wardName: ''
            })
          }}
        />
      </div>

      <div className="form-group">
        <SearchableSelect
          label="Phường/Xã"
          required
          placeholder={districtCode ? 'Gõ để tìm phường/xã...' : 'Chọn quận/huyện trước'}
          value={String(wardCode || '')}
          disabled={!districtCode}
          options={wards.map((w) => ({ value: String(w.code), label: w.name }))}
          onChange={(val) => {
            const code = String(val || '')
            setWardCode(code)
            const w = wards.find((x) => String(x.code) === code)
            onChange?.({
              wardCode: String(w?.code || ''),
              wardName: w?.name || ''
            })
          }}
        />
      </div>
    </>
  )
}

