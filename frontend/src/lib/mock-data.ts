export const mockTrips = [
  {
    id: "trip-1",
    title: "Romantic Bali Getaway",
    destination: "Bali, Indonesia",
    dates: "Mar 15 – Mar 22, 2026",
    budget: "$2,400",
    travelers: "2 Adults",
    status: "planned" as const,
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop",
    days: 7,
    summary: "A week-long escape through Ubud's rice terraces, Seminyak beaches, and Uluwatu temples.",
  },
  {
    id: "trip-2",
    title: "Tokyo Culture & Food Tour",
    destination: "Tokyo, Japan",
    dates: "Apr 5 – Apr 12, 2026",
    budget: "$3,800",
    travelers: "2 Adults, 1 Child",
    status: "draft" as const,
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop",
    days: 7,
    summary: "Explore Shibuya, Asakusa, Tsukiji, and hidden ramen spots across Tokyo.",
  },
  {
    id: "trip-3",
    title: "Swiss Alps Adventure",
    destination: "Switzerland",
    dates: "Jun 10 – Jun 17, 2026",
    budget: "$5,200",
    travelers: "4 Adults",
    status: "shared" as const,
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&h=400&fit=crop",
    days: 7,
    summary: "Hiking, scenic trains, and lakeside villages in the Swiss Alps.",
  },
];

export const mockItinerary = [
  {
    day: 1,
    title: "Arrival & Ubud Exploration",
    date: "Mar 15",
    activities: [
      { time: "10:00 AM", title: "Arrive at Ngurah Rai Airport", type: "transport" as const, cost: "$0" },
      { time: "12:30 PM", title: "Check-in at Viceroy Bali", type: "hotel" as const, cost: "$180" },
      { time: "2:00 PM", title: "Tegallalang Rice Terraces", type: "activity" as const, cost: "$15" },
      { time: "6:00 PM", title: "Dinner at Locavore", type: "food" as const, cost: "$85" },
    ],
  },
  {
    day: 2,
    title: "Temples & Waterfalls",
    date: "Mar 16",
    activities: [
      { time: "8:00 AM", title: "Tirta Empul Water Temple", type: "activity" as const, cost: "$10" },
      { time: "11:00 AM", title: "Tegenungan Waterfall", type: "activity" as const, cost: "$5" },
      { time: "1:00 PM", title: "Lunch at Warung Babi Guling", type: "food" as const, cost: "$12" },
      { time: "4:00 PM", title: "Ubud Monkey Forest", type: "activity" as const, cost: "$8" },
      { time: "7:30 PM", title: "Balinese Dance Performance", type: "activity" as const, cost: "$20" },
    ],
  },
  {
    day: 3,
    title: "Seminyak Beach Day",
    date: "Mar 17",
    activities: [
      { time: "9:00 AM", title: "Transfer to Seminyak", type: "transport" as const, cost: "$25" },
      { time: "11:00 AM", title: "Beach Club at Potato Head", type: "activity" as const, cost: "$45" },
      { time: "2:00 PM", title: "Surfing Lesson", type: "activity" as const, cost: "$35" },
      { time: "7:00 PM", title: "Sunset Dinner at La Lucciola", type: "food" as const, cost: "$65" },
    ],
  },
];

export const mockWeather = [
  { day: "Mon", temp: 29, condition: "Sunny", icon: "☀️" },
  { day: "Tue", temp: 28, condition: "Partly Cloudy", icon: "⛅" },
  { day: "Wed", temp: 30, condition: "Sunny", icon: "☀️" },
  { day: "Thu", temp: 27, condition: "Rain", icon: "🌧️" },
  { day: "Fri", temp: 28, condition: "Thunderstorm", icon: "⛈️" },
  { day: "Sat", temp: 29, condition: "Sunny", icon: "☀️" },
  { day: "Sun", temp: 30, condition: "Sunny", icon: "☀️" },
];

export const mockChatMessages = [
  { role: "assistant" as const, content: "I've created a 7-day Bali itinerary for you! The trip includes cultural experiences in Ubud, beach days in Seminyak, and a sunset visit to Uluwatu Temple. Would you like to adjust anything?" },
  { role: "user" as const, content: "Can we add a cooking class on day 2?" },
  { role: "assistant" as const, content: "Done! I've added a Balinese Cooking Class in Ubud on Day 2 at 3:00 PM. It's a 3-hour hands-on session where you'll learn to make traditional dishes like Nasi Goreng and Satay. Cost: $35/person." },
];

export const mockPackingList = [
  { category: "Essentials", items: ["Passport", "Travel insurance docs", "Phone charger", "Power adapter"] },
  { category: "Clothing", items: ["Light cotton shirts", "Swimwear", "Sarong (temple visits)", "Rain jacket", "Comfortable walking shoes"] },
  { category: "Health", items: ["Sunscreen SPF 50+", "Insect repellent", "First aid kit", "Prescription medications"] },
  { category: "Tech", items: ["Camera", "Portable charger", "Headphones", "E-reader"] },
];

export const mockFoodVenue = {
  id: "f1",
  name: "Locavore",
  cuisine: "Modern Indonesian",
  rating: 4.9,
  reviews: 847,
  priceRange: "$$$",
  address: "Jl. Dewi Sita, Ubud, Bali 80571",
  hours: "12:00 PM – 10:00 PM",
  image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop",
  description: "Award-winning restaurant celebrating Indonesian ingredients with modern techniques. Chef Ray Adriansyah creates seasonal menus using 95% locally sourced produce.",
  dietaryTags: ["Vegetarian Options", "Gluten-Free Available", "Organic", "Farm-to-Table"],
  menu: [
    { name: "Tasting Menu", description: "7-course seasonal journey through Indonesian flavors", price: "$85", popular: true },
    { name: "Nasi Goreng Reimagined", description: "Deconstructed fried rice with foraged herbs", price: "$28", popular: true },
    { name: "Babi Guling Terrine", description: "Slow-roasted suckling pig with sambal matah", price: "$32", popular: false },
    { name: "Jukut Urab", description: "Mixed vegetables with fresh coconut and spices", price: "$18", popular: false, dietary: "Vegetarian" },
    { name: "Tropical Sorbet Flight", description: "Mango, passion fruit, and coconut", price: "$14", popular: false, dietary: "Vegan" },
  ],
};
