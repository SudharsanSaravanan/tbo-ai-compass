# Weather Integration Setup Guide

## Overview

The Trip Weaver project now includes **smart weather integration** using the OpenWeather API. This feature automatically determines whether to show forecast data (for trips ≤16 days away) or historical climate data (for trips >16 days away).

---

## Features

✅ **Auto-switching logic**: Seamlessly switches from historical to forecast as trip approaches  
✅ **Smart date calculation**: Determines which API to use based on current date  
✅ **Graceful error handling**: Displays fallback messages if API fails  
✅ **Loading states**: Shows loading animation while fetching weather  
✅ **Historical badge**: Clearly labels historical weather data  
✅ **Weather alerts**: Displays warnings for severe weather conditions  
✅ **Rain probability**: Shows rain chances when available  

---

## Setup Instructions

### 1. Get Your OpenWeather API Key

1. Go to [OpenWeather](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to **API keys** section
4. Copy your API key

### 2. Configure Environment Variables

1. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your API key:
   ```env
   VITE_OPENWEATHER_API_KEY=your_actual_api_key_here
   ```

3. **Important**: The `.env` file is already in `.gitignore` to prevent accidental commit of your API key.

### 3. Restart Development Server

After adding your API key, restart the development server:

```bash
npm run dev
```

---

## How It Works

### Weather Logic Flow

```
User views trip
    ↓
Calculate: Days until trip start
    ↓
    ├─→ ≤16 days? → Use 16-day Forecast API
    │                 ├─ Temperature (min/max)
    │                 ├─ Condition (clear, rain, etc.)
    │                 ├─ Weather icon
    │                 ├─ Rain probability
    │                 └─ Severe weather alerts
    │
    └─→ >16 days? → Use Historical/Climate Data
                      ├─ Average temperature
                      ├─ Typical weather condition
                      ├─ Badge: "Based on Historical Trends"
                      └─ Note: "Subject to Change"
```

### Auto-Update Behavior

- **Trip Dashboard**: Weather fetches when page loads
- **Microsite**: Weather recalculates on every visit (always fresh!)
- **Auto-switch**: When trip becomes ≤16 days, automatically switches to forecast

---

## API Endpoints Used

### 1. Geocoding API
**Purpose**: Convert city name to coordinates  
**Endpoint**: `https://api.openweathermap.org/geo/1.0/direct`

### 2. 16-Day Forecast (Free Tier)
**Purpose**: Get daily forecast for next 16 days  
**Endpoint**: `https://api.openweathermap.org/data/2.5/data/2.5/forecast`  
**When Used**: Trip starts within 16 days

### 3. Current Weather (Historical Proxy)
**Purpose**: Get current conditions as proxy for climate average  
**Endpoint**: `https://api.openweathermap.org/data/2.5/weather`  
**When Used**: Trip starts >16 days away

> **Note**: For production, consider upgrading to OpenWeather's paid plan to access true historical API (`onecall/timemachine`) for more accurate historical data.

---

## File Structure

```
src/
├── services/
│   └── weatherService.ts         # Weather API logic & smart date handling
├── components/
│   └── WeatherDisplay.tsx        # Reusable weather UI component
└── pages/
    ├── TripDashboard.tsx         # Integrated weather in trip view
    └── MicrositeView.tsx         # Integrated weather in microsite
```

---

## Weather Data Format

### WeatherResponse Type
```typescript
{
  type: "forecast" | "historical",
  city: string,
  dates: [
    {
      date: "2026-03-15",
      tempMin: 25,
      tempMax: 32,
      condition: "Clear",
      icon: "☀️",
      rainProbability: 10,          // Optional
      alert: "⚠️ Severe weather"    // Optional
    }
  ],
  error?: boolean,
  message?: string
}
```

---

## Error Handling

### Scenario 1: API Key Missing
**Display**: "Weather API key not configured"  
**Solution**: Add `VITE_OPENWEATHER_API_KEY` to `.env`

### Scenario 2: City Not Found
**Display**: "City not found"  
**Cause**: Invalid or misspelled city name  
**Solution**: Check city name format in trip data

### Scenario 3: API Limit Exceeded
**Display**: "Weather data temporarily unavailable"  
**Cause**: Free tier allows 60 calls/minute, 1,000,000 calls/month  
**Solution**: Wait or upgrade to paid plan

### Scenario 4: Network Failure
**Display**: "Weather data unavailable"  
**Fallback**: User can still view itinerary normally

---

## Testing

### Test Forecast Mode (≤16 days)
1. Create a trip with start date within next 16 days
2. Weather should show real forecast data
3. No "Historical Trends" badge should appear

### Test Historical Mode (>16 days)
1. Create a trip with start date >16 days away
2. Weather should show climate data
3. "Based on Historical Trends" badge should appear

### Test Error States
1. Remove API key from `.env`
2. Restart dev server
3. Should show error message gracefully

---

## Performance Optimization

### Current Implementation
- ✅ Weather fetches **only on page load**
- ✅ **No caching** - ensures fresh data on microsite
- ✅ **Async loading** - doesn't block itinerary display
- ✅ Loading states prevent layout shift

### Future Improvements
Consider implementing:
- Local caching with TTL (time-to-live)
- Background refresh for long-running sessions
- Prefetching for upcoming trips

---

## Production Considerations

### 1. Rate Limiting
Free tier limits:
- 60 calls/minute
- 1,000,000 calls/month

**Solution**: Implement caching or upgrade plan for high-traffic apps.

### 2. True Historical Data
Current implementation uses current weather as historical proxy.

**Upgrade to paid plan** for:
- `onecall/timemachine` API
- Actual historical data from past 3-5 years
- More accurate climate trends

### 3. Multiple Cities
If trip has multiple cities:
- Weather service supports single city
- For multi-city trips, call `getWeatherForTrip()` for each city
- Consider batching requests

---

## Troubleshooting

### Weather not showing?
1. ✅ Check `.env` file exists
2. ✅ Verify API key is correct
3. ✅ Restart dev server after adding API key
4. ✅ Check browser console for errors

### Wrong weather type?
1. ✅ Verify trip dates are parsed correctly
2. ✅ Check `getDaysDifference()` calculation
3. ✅ Console log `daysDiff` value

### API calls failing?
1. ✅ Test API key at [OpenWeather](https://openweathermap.org/)
2. ✅ Check API call limits on your account
3. ✅ Verify network connectivity

---

## Support

For issues or questions:
1. Check [OpenWeather API Documentation](https://openweathermap.org/api)
2. Review browser console for error messages
3. Verify environment variables are loaded correctly

---

**Happy Coding! 🌤️**
