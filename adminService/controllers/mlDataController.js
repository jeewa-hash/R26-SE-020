const axios = require('axios');
const { differenceInDays } = require('date-fns');
const MLData = require('../models/MLData');

const CALENDARIFIC_API_KEY = 'miym2tkkEJmfOBLwiuzTlabtwhIhEPrn';
const CALENDARIFIC_URL = 'https://calendarific.com/api/v2/holidays';
const OPEN_METEO_URL = 'https://archive-api.open-meteo.com/v1/archive';
const TIMEZONE = 'Asia/Colombo';

const DISTRICT_COORDINATES = {
    Colombo: { latitude: 6.9271, longitude: 79.8612 },
    Gampaha: { latitude: 7.0840, longitude: 79.9927 }
};

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
    const [year, month, day] = formatISODate(dateObj).split('-');

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
        return holidays.length > 0;
    } catch (error) {
        console.warn('[WARNING] Calendarific lookup failed:', error.message || error);
        return false;
    }
};

const fetchRainForDate = async (dateObj, coords) => {
    const dateString = formatISODate(dateObj);
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
        return Number(rainSum) > 0.5;
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

    if (!district || !DISTRICT_COORDINATES[district]) {
        throw new Error(`Unsupported district: ${district}. Supported values are Colombo and Gampaha.`);
    }

    const coords = DISTRICT_COORDINATES[district];
    const isHoliday = await fetchHolidayForDate(parsedDate) ? 1 : 0;
    const isRainy = await fetchRainForDate(parsedDate, coords) ? 1 : 0;
    const isSpecialEvent = isSpecialEventDate(parsedDate) ? 1 : 0;
    const isLongWeekend = await computeLongWeekend(parsedDate, Boolean(isHoliday));
    const isSunny = isRainy ? 0 : 1;

    const lastRecord = await MLData.findOne({ Category: category, District: district }).sort({ _id: -1 });
    let sunnyCounter = 0;
    let rainyCounter = 0;

    if (lastRecord) {
        const lastRecordDate = new Date(lastRecord.Date);
        const daysDifference = differenceInDays(parsedDate, lastRecordDate);

        if (daysDifference === 0) {
            // Case 0: Same day - do not increment, use last record's counts
            sunnyCounter = Number(lastRecord.Sunny_Days_Consecutive) || 0;
            rainyCounter = Number(lastRecord.Rainy_Days_Consecutive) || 0;
        } else if (daysDifference === 1) {
            // Case 1: Very next day - check if weather matches
            const lastWasRainy = Number(lastRecord.Is_Rainy) === 1;
            if (isRainy && lastWasRainy) {
                // Weather continuation: rainy to rainy
                rainyCounter = (Number(lastRecord.Rainy_Days_Consecutive) || 0) + 1;
                sunnyCounter = 0;
            } else if (!isRainy && !lastWasRainy) {
                // Weather continuation: sunny to sunny
                sunnyCounter = (Number(lastRecord.Sunny_Days_Consecutive) || 0) + 1;
                rainyCounter = 0;
            } else {
                // Weather changed: reset new weather type to 1, other to 0
                if (isRainy) {
                    rainyCounter = 1;
                    sunnyCounter = 0;
                } else {
                    sunnyCounter = 1;
                    rainyCounter = 0;
                }
            }
        } else if (daysDifference > 1) {
            // Case 2: Gap in logs - reset counts since we don't know missing weather
            if (isRainy) {
                rainyCounter = 1;
                sunnyCounter = 0;
            } else {
                sunnyCounter = 1;
                rainyCounter = 0;
            }
        }
    } else {
        // No previous record - initialize counts
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
        District: district,
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

const logServiceForML = async (serviceInfo) => {
    try {
        const { date, category, district } = serviceInfo;

        if (!date || !category || !district) {
            throw new Error('date, category and district are required');
        }

        const features = await prepareFeatures(date, category, district);

        const mlRecord = new MLData({
            ...features,
            Demand_Count: 1
        });

        await mlRecord.save();
        console.log('[INFO] ML Data logged successfully for:', category, district);
    } catch (error) {
        console.error('[ERROR] Error logging ML data:', error.message || error);
    }
};

const getSmartPrediction = async (req, res) => {
    try {
        const { date, category, district } = req.body;

        if (!date || !category || !district) {
            return res.status(400).json({ error: 'date, category and district are required' });
        }

        const features = await prepareFeatures(date, category, district);

        const response = await axios.post('http://127.0.0.1:5000/predict', features);

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

        // Concurrency limiter logic
        const fetchPrediction = async (date, category, district) => {
            try {
                const features = await prepareFeatures(date, category, district);
                const response = await axios.post('http://127.0.0.1:5000/predict', features);
                return response.data;
            } catch (err) {
                console.warn(`[WARNING] Failed prediction for ${district} - ${category} on ${date}:`, err.message);
                return null;
            }
        };

        const promises = [];
        for (const date of dates) {
            for (const category of categories) {
                for (const district of districts) {
                    promises.push(fetchPrediction(date, category, district));
                }
            }
        }

        // Wait for all to finish
        // For large arrays (e.g. 14 * 10 * 2 = 280), Node.js can handle `Promise.all` easily if the Python server is fast.
        // Waitress handles concurrency.
        const results = await Promise.all(promises);
        
        // Filter out any nulls from failures
        const validResults = results.filter(r => r !== null);

        res.json({ predictions: validResults });
    } catch (error) {
        console.error('[ERROR] Error in smart prediction batch:', error.message || error);
        res.status(500).json({ error: 'Batch prediction failed', details: error.message });
    }
};

module.exports = { logServiceForML, getSmartPrediction, getSmartPredictionBatch };