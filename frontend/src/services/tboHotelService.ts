export interface TboCity {
    Code: string;
    Name: string;
}

export interface TboHotel {
    HotelCode: string;
    HotelName: string;
    HotelRating: string;
    Address: string;
    Attractions: string[];
    CountryName: string;
    CountryCode: string;
    Description: string;
    FaxNumber: string;
    HotelFacilities: string[];
    Map: string;
    PhoneNumber: string;
    PinCode: string;
    HotelWebsiteUrl: string;
    CityName: string;
}

const AUTH_HEADER = "Basic " + btoa("TBO_API_KEY:TBO_SECRET_KEY");

export async function fetchTboCityCode(cityName: string, countryCode: string = "IN"): Promise<string | null> {
    try {
        const res = await fetch("/tbo-api/TBOHolidays_HotelAPI/CityList", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": AUTH_HEADER
            },
            body: JSON.stringify({ CountryCode: countryCode })
        });
        const data = await res.json();
        if (data?.Status?.Code === 200 && data.CityList) {
            // Find the city that best matches the cityName string
            const searchName = cityName.trim().toLowerCase();
            const city = data.CityList.find((c: TboCity) => c.Name.toLowerCase().includes(searchName));
            if (city) {
                return city.Code;
            }
        }
        return null;
    } catch (error) {
        console.error("Error fetching TBO City code:", error);
        return null;
    }
}

export async function fetchTboHotels(cityCode: string | number): Promise<TboHotel[]> {
    try {
        const res = await fetch("/tbo-api/TBOHolidays_HotelAPI/TBOHotelCodeList", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": AUTH_HEADER
            },
            body: JSON.stringify({
                CityCode: typeof cityCode === "string" ? parseInt(cityCode, 10) : cityCode,
                IsDetailedResponse: true
            })
        });
        const data = await res.json();
        if (data?.Status?.Code === 200 && data.Hotels) {
            return data.Hotels;
        }
        return [];
    } catch (error) {
        console.error("Error fetching TBO Hotels:", error);
        return [];
    }
}
