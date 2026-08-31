const axios = require('axios');
const mongoose = require('mongoose');
const { differenceInDays } = require('date-fns');
const MLData = require('../models/MLData');
const Provider = require('../models/Provider');
const Seeker = require('../models/Seeker');

const CALENDARIFIC_API_KEY = process.env.CALENDARIFIC_API_KEY || '5RNoUlmJqTubUQ9kMlp2UGEDw6ftBWIW';
const CALENDARIFIC_URL = 'https://calendarific.com/api/v2/holidays';
const OPEN_METEO_URL = 'https://archive-api.open-meteo.com/v1/archive';
const TIMEZONE = 'Asia/Colombo';

const DISTRICT_COORDINATES = {
    Colombo: { latitude: 6.9271, longitude: 79.8612 },
    Gampaha: { latitude: 7.0840, longitude: 79.9927 },
    Kalutara: { latitude: 6.5854, longitude: 79.9607 },
    Kandy: { latitude: 7.2906, longitude: 80.6337 },
    Matale: { latitude: 7.4675, longitude: 80.6234 },
    'Nuwara Eliya': { latitude: 6.9497, longitude: 80.7891 },
    Galle: { latitude: 6.0535, longitude: 80.2210 },
    Matara: { latitude: 5.9549, longitude: 80.5550 },
    Hambantota: { latitude: 6.1429, longitude: 81.1212 },
    Jaffna: { latitude: 9.6615, longitude: 80.0255 },
    Kilinochchi: { latitude: 9.3803, longitude: 80.3770 },
    Mannar: { latitude: 8.9810, longitude: 79.9044 },
    Vavuniya: { latitude: 8.7542, longitude: 80.4982 },
    Mullaitivu: { latitude: 9.2671, longitude: 80.8142 },
    Batticaloa: { latitude: 7.7310, longitude: 81.6747 },
    Ampara: { latitude: 7.2974, longitude: 81.6820 },
    Trincomalee: { latitude: 8.5874, longitude: 81.2152 },
    Kurunegala: { latitude: 7.4863, longitude: 80.3623 },
    Puttalam: { latitude: 8.0408, longitude: 79.8394 },
    Anuradhapura: { latitude: 8.3114, longitude: 80.4037 },
    Polonnaruwa: { latitude: 7.9403, longitude: 81.0188 },
    Badulla: { latitude: 6.9934, longitude: 81.0550 },
    Monaragala: { latitude: 6.8728, longitude: 81.3507 },
    Ratnapura: { latitude: 6.6828, longitude: 80.3992 },
    Kegalle: { latitude: 7.2513, longitude: 80.3464 }
};

// Caches to avoid redundant API calls and stay within rate limits
const holidayCache = new Map(); // key: YYYY-MM-DD, value: boolean
const rainCache = new Map();    // key: YYYY-MM-DD:District, value: boolean

const formatISODate = (dateObj) => dateObj.toISOString().slice(0, 10);
const toDayOfWeek = (dateObj) => {
    const dow = dateObj.getDay();
    return dow === 0 ? 6 : dow - 1;
};
const isWeekend = (dateObj) => {
    const dow = dateObj.getDay();
    return dow === 0 || dow === 6;
};
const addDays = (dateObj, amount) => {
    const result = new Date(dateObj);
    result.setDate(result.getDate() + amount);
    return result;
};

const fetchHolidayForDate = async (dateObj) => {
    const dateString = formatISODate(dateObj);
    if (holidayCache.has(dateString)) return holidayCache.get(dateString);

    const [year, month, day] = dateString.split('-');

    try {
        const response = await axios.get(CALENDARIFIC_URL, {
            params: {
                api_key: CALENDARIFIC_API_KEY,
                country: 'LK',
                year,
                month,
                day,
                type: 'public'
            },
            timeout: 10000
        });

        const holidays = response?.data?.response?.holidays || [];
        const isHoliday = holidays.length > 0;
        holidayCache.set(dateString, isHoliday);
        return isHoliday;
    } catch (error) {
        if (error.response?.status === 429) {
            console.warn(`[WARNING] Calendarific Rate Limit hit for ${dateString}. Defaulting to non-holiday.`);
        } else {
            console.warn('[WARNING] Calendarific lookup failed:', error.message || error);
        }
        return false;
    }
};

const fetchRainForDate = async (dateObj, coords, districtName) => {
    const dateString = formatISODate(dateObj);
    const cacheKey = `${dateString}:${districtName}`;
    if (rainCache.has(cacheKey)) return rainCache.get(cacheKey);

    const { latitude, longitude } = coords;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateObj);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    let apiUrl = OPEN_METEO_URL; // Default archive
    
    if (diffDays >= 0 && diffDays <= 14) {
        apiUrl = 'https://api.open-meteo.com/v1/forecast';
    } else if (diffDays > 14) {
        // Weather forecast beyond 14 days is not supported by free API
        return false;
    }

    try {
        const response = await axios.get(apiUrl, {
            params: {
                latitude,
                longitude,
                start_date: dateString,
                end_date: dateString,
                daily: 'rain_sum',
                timezone: TIMEZONE
            },
            timeout: 10000
        });

        const rainSum = response?.data?.daily?.rain_sum?.[0];
        const isRainy = Number(rainSum) > 0.5;
        rainCache.set(cacheKey, isRainy);
        return isRainy;
    } catch (error) {
        console.warn(`[WARNING] Open-Meteo lookup failed for ${dateString}:`, error.message);
        return false;
    }
};

const isSpecialEventDate = (dateObj) => {
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    return month === 4 && day >= 1 && day <= 21;
};

const computeLongWeekend = async (dateObj, isHoliday) => {
    const currentBreak = isHoliday || isWeekend(dateObj);
    const prevDate = addDays(dateObj, -1);
    const nextDate = addDays(dateObj, 1);
    const prev2Date = addDays(dateObj, -2);
    const next2Date = addDays(dateObj, 2);

    const [prevHoliday, nextHoliday, prev2Holiday, next2Holiday] = await Promise.all([
        fetchHolidayForDate(prevDate),
        fetchHolidayForDate(nextDate),
        fetchHolidayForDate(prev2Date),
        fetchHolidayForDate(next2Date)
    ]);

    const prevBreak = prevHoliday || isWeekend(prevDate);
    const nextBreak = nextHoliday || isWeekend(nextDate);
    const prev2Break = prev2Holiday || isWeekend(prev2Date);
    const next2Break = next2Holiday || isWeekend(next2Date);

    if (!currentBreak) return 0;

    const hasCenteredLongWeekend = prevBreak && nextBreak;
    const hasForwardLongWeekend = nextBreak && next2Break;
    const hasBackwardLongWeekend = prevBreak && prev2Break;

    return hasCenteredLongWeekend || hasForwardLongWeekend || hasBackwardLongWeekend ? 1 : 0;
};

const prepareFeatures = async (date, category, district) => {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date format: ${date}`);
    }

    const cleanDistrict = district || 'Colombo';
    const coords = DISTRICT_COORDINATES[cleanDistrict] || DISTRICT_COORDINATES.Colombo;

    const isHoliday = await fetchHolidayForDate(parsedDate) ? 1 : 0;
    const isRainy = await fetchRainForDate(parsedDate, coords, cleanDistrict) ? 1 : 0;
    const isSpecialEvent = isSpecialEventDate(parsedDate) ? 1 : 0;
    const isLongWeekend = await computeLongWeekend(parsedDate, Boolean(isHoliday));
    const isSunny = isRainy ? 0 : 1;

    const lastRecord = await MLData.findOne({ Category: category, District: cleanDistrict }).sort({ _id: -1 });
    let sunnyCounter = 0;
    let rainyCounter = 0;

    if (lastRecord) {
        const lastRecordDate = new Date(lastRecord.Date);
        const daysDifference = differenceInDays(parsedDate, lastRecordDate);

        if (daysDifference === 0) {
            sunnyCounter = Number(lastRecord.Sunny_Days_Consecutive) || 0;
            rainyCounter = Number(lastRecord.Rainy_Days_Consecutive) || 0;
        } else if (daysDifference === 1) {
            const lastWasRainy = Number(lastRecord.Is_Rainy) === 1;
            if (isRainy && lastWasRainy) {
                rainyCounter = (Number(lastRecord.Rainy_Days_Consecutive) || 0) + 1;
                sunnyCounter = 0;
            } else if (!isRainy && !lastWasRainy) {
                sunnyCounter = (Number(lastRecord.Sunny_Days_Consecutive) || 0) + 1;
                rainyCounter = 0;
            } else {
                if (isRainy) {
                    rainyCounter = 1;
                    sunnyCounter = 0;
                } else {
                    sunnyCounter = 1;
                    rainyCounter = 0;
                }
            }
        } else if (daysDifference > 1) {
            if (isRainy) {
                rainyCounter = 1;
                sunnyCounter = 0;
            } else {
                sunnyCounter = 1;
                rainyCounter = 0;
            }
        }
    } else {
        if (isRainy) {
            rainyCounter = 1;
            sunnyCounter = 0;
        } else {
            sunnyCounter = 1;
            rainyCounter = 0;
        }
    }

    return {
        Date: formatISODate(parsedDate),
        Category: category,
        District: cleanDistrict,
        Month: parsedDate.getMonth() + 1,
        Day: parsedDate.getDate(),
        DayOfWeek: toDayOfWeek(parsedDate),
        Is_Holiday: isHoliday,
        Is_Long_Weekend: isLongWeekend,
        Is_Rainy: isRainy,
        Is_Sunny: isSunny,
        Sunny_Days_Consecutive: sunnyCounter,
        Rainy_Days_Consecutive: rainyCounter,
        Special_Event: isSpecialEvent
    };
};

const logServiceForML = async (req, res) => {
    try {
        const payload = req?.body || req;
        const { date, category, district, bookingId } = payload;

        if (!date || !category || !district) {
            if (res && typeof res.status === 'function') {
                return res.status(400).json({ error: 'date, category and district are required' });
            }
            throw new Error('date, category and district are required');
        }

        // Avoid duplicate logging if bookingId is specified
        if (bookingId) {
            const existing = await MLData.findOne({ bookingId });
            if (existing) {
                if (res && typeof res.status === 'function') {
                    return res.status(200).json({ message: 'Booking already logged for ML', data: existing });
                }
                return existing;
            }
        }

        const features = await prepareFeatures(date, category, district);

        const mlRecord = new MLData({
            ...features,
            Demand_Count: 1,
            bookingId: bookingId || null,
            isRetrained: false
        });

        await mlRecord.save();
        console.log('[INFO] ML Data logged successfully into service_data_for_csvs for:', category, district, 'Date:', date);
        
        if (res && typeof res.status === 'function') {
            return res.status(200).json({ success: true, message: 'Data logged for ML', data: mlRecord });
        }
        return mlRecord;
    } catch (error) {
        console.error('[ERROR] Error logging ML data:', error.message || error);
        if (res && typeof res.status === 'function') {
            return res.status(500).json({ error: 'Failed to log ML data', details: error.message });
        }
    }
};

const logBookingForML = async (bookingData) => {
    try {
        const bookingId = String(bookingData._id || bookingData.id || bookingData.bookingId || '');
        if (bookingId) {
            const existing = await MLData.findOne({ bookingId });
            if (existing) return existing;
        }

        const date = bookingData.scheduledDate || bookingData.initialSchedule?.date || new Date().toISOString().slice(0, 10);
        let category = bookingData.category || bookingData.serviceCategory || '';
        let district = bookingData.district || bookingData.location?.district || '';

        // If category or district missing, resolve from Provider or Seeker
        if ((!category || !district) && bookingData.providerId) {
            try {
                const provider = await Provider.findById(bookingData.providerId);
                if (provider) {
                    if (!category) category = provider.category;
                    if (!district) district = provider.district;
                }
            } catch (pErr) {
                // silent
            }
        }

        if (!district && bookingData.seekerId) {
            try {
                const seeker = await Seeker.findById(bookingData.seekerId);
                if (seeker && seeker.district) {
                    district = seeker.district;
                }
            } catch (sErr) {
                // silent
            }
        }

        category = category || 'General Service';
        district = district || 'Colombo';

        return await logServiceForML({
            date,
            category,
            district,
            bookingId: bookingId || null
        });
    } catch (err) {
        console.error('[ERROR] logBookingForML failed:', err.message);
    }
};

// Automatic Real-Time Watcher for Bookings -> service_data_for_csvs
let coordinationDb = null;
let watcherInitialized = false;

const initBookingWatcher = async () => {
    if (watcherInitialized) return;
    watcherInitialized = true;

    try {
        const coordUri = process.env.COORDINATION_MONGO_URI;
        if (!coordUri) return;

        coordinationDb = await mongoose.createConnection(coordUri).asPromise();
        console.log('✅ Coordination DB Connected for Real-Time Booking -> ML Synchronization');

        const syncUnloggedBookings = async () => {
            try {
                const bookingsCollection = coordinationDb.collection('bookings');
                const bookings = await bookingsCollection.find({}).sort({ createdAt: -1 }).limit(50).toArray();

                for (const b of bookings) {
                    const bId = String(b._id);
                    const alreadyLogged = await MLData.findOne({ bookingId: bId });
                    if (!alreadyLogged) {
                        await logBookingForML(b);
                    }
                }
            } catch (syncErr) {
                // silent background sync error
            }
        };

        // Run sync initially
        await syncUnloggedBookings();

        // Run continuous real-time interval watchdog (every 4 seconds)
        setInterval(syncUnloggedBookings, 4000);

    } catch (err) {
        console.warn('⚠️ Booking watcher initialization note:', err.message);
    }
};

const fetchPrediction = async (date, category, district) => {
    try {
        const features = await prepareFeatures(date, category, district);
        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';
        const response = await axios.post(`${ML_SERVICE_URL}/predict`, features);
        return response.data;
    } catch (err) {
        console.warn(`[WARNING] Failed prediction for ${district} - ${category} on ${date}:`, err.message);
        return null;
    }
};

const getSmartPrediction = async (req, res) => {
    try {
        const { date, category, district } = req.body;

        if (!date || !category || !district) {
            return res.status(400).json({ error: 'date, category and district are required' });
        }

        const features = await prepareFeatures(date, category, district);
        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';
        const response = await axios.post(`${ML_SERVICE_URL}/predict`, features);

        res.json({ prediction: response.data });
    } catch (error) {
        console.error('[ERROR] Error in smart prediction:', error.message || error);
        res.status(500).json({ error: 'Prediction failed', details: error.message });
    }
};

const getSmartPredictionBatch = async (req, res) => {
    try {
        const { dates, categories, districts } = req.body;

        if (!Array.isArray(dates) || !Array.isArray(categories) || !Array.isArray(districts)) {
            return res.status(400).json({ error: 'dates, categories, and districts must be arrays' });
        }

        const allPredictions = [];

        // To avoid overwhelming the DB and external APIs, process in chunks
        const CHUNK_SIZE = 10;
        const tasks = [];
        for (const date of dates) {
            for (const category of categories) {
                for (const district of districts) {
                    tasks.push({ date, category, district });
                }
            }
        }

        for (let i = 0; i < tasks.length; i += CHUNK_SIZE) {
            const chunk = tasks.slice(i, i + CHUNK_SIZE);
            const chunkPromises = chunk.map(task => 
                fetchPrediction(task.date, task.category, task.district)
            );
            const chunkResults = await Promise.all(chunkPromises);
            allPredictions.push(...chunkResults.filter(r => r !== null));
        }

        // Clear caches after a large batch to save memory
        if (tasks.length > 50) {
            holidayCache.clear();
            rainCache.clear();
        }

        res.json({ predictions: allPredictions });
    } catch (error) {
        console.error('[ERROR] Error in smart prediction batch:', error.message || error);
        res.status(500).json({ error: 'Batch prediction failed', details: error.message });
    }
};

module.exports = {
    logServiceForML,
    logBookingForML,
    initBookingWatcher,
    getSmartPrediction,
    getSmartPredictionBatch
};