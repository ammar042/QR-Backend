// utils/geocode.js

export async function geocodeAddress(address, district, province) {
  try {
    const query = encodeURIComponent(`${address}, ${district}, ${province}, Pakistan`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { "User-Agent": "BloodNeeder/1.0 (contact: tayyabaakram7569@gmail.com)" } }
    );
    const data = await res.json();

    if (!data || data.length === 0) {
      console.warn("⚠️ Geocoding failed, no results for:", address, district, province);
      return [0, 0];
    }

    const lng = parseFloat(data[0].lon);
    const lat = parseFloat(data[0].lat);
    console.log(`✅ Geocoded "${address}, ${district}" → [${lng}, ${lat}]`);
    return [lng, lat];
  } catch (err) {
    console.error("❌ Geocoding error:", err.message);
    return [0, 0];
  }
}