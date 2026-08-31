const mongoose = require('mongoose');
const Seeker = require('../models/Seeker');
const inquiryController = require('./inquiryController');

// Secondary mongoose connection to Coordination Database (PP1)
let coordinationDb = null;
const getCoordinationConnection = async () => {
  const existing = inquiryController.getCoordinationDb();
  if (existing && existing.readyState === 1) {
    return existing;
  }
  if (coordinationDb && coordinationDb.readyState === 1) {
    return coordinationDb;
  }
  if (process.env.COORDINATION_MONGO_URI) {
    try {
      coordinationDb = await mongoose.createConnection(process.env.COORDINATION_MONGO_URI).asPromise();
      console.log('✅ Coordination DB Connected for Analytics');
      return coordinationDb;
    } catch (err) {
      console.log('Coordination DB connection error in Analytics:', err.message);
    }
  }
  return coordinationDb;
};

const ALL_SRI_LANKA_DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kilinochchi',
  'Mannar',
  'Vavuniya',
  'Mullaitivu',
  'Batticaloa',
  'Ampara',
  'Trincomalee',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Monaragala',
  'Ratnapura',
  'Kegalle',
];

/**
 * GET /api/analytics/demand-supply
 * Aggregates demand (total bookings) and supply (completed bookings) by Seeker's district.
 * Active districts: Colombo, Gampaha.
 * Other 23 districts: Coming soon... (Yellow)
 */
exports.getDemandSupplyAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // 1. Fetch Seekers and build Seeker ID -> District mapping
    let seekers = [];
    try {
      seekers = await Seeker.find({}, '_id district name').lean();
    } catch (sErr) {
      console.log('Error fetching seekers via Model, trying native collection:', sErr.message);
      if (mongoose.connection && mongoose.connection.db) {
        seekers = await mongoose.connection.db.collection('seekers').find({}).toArray();
      }
    }

    const seekerDistrictMap = {};
    seekers.forEach((s) => {
      if (s._id) {
        seekerDistrictMap[s._id.toString()] = (s.district || '').trim();
      }
    });

    // 2. Fetch Bookings from Coordination Database (PP1)
    let bookings = [];
    try {
      let bookingsColl = null;
      const coordConn = await getCoordinationConnection();
      if (coordConn && coordConn.readyState === 1) {
        bookingsColl = coordConn.collection('bookings');
      } else if (mongoose.connection && mongoose.connection.readyState === 1) {
        bookingsColl = mongoose.connection.useDb('PP1').collection('bookings');
      }

      if (bookingsColl) {
        let filter = {};
        if (startDate || endDate) {
          filter.$or = [
            {
              scheduledDate: {
                ...(startDate && { $gte: startDate }),
                ...(endDate && { $lte: endDate }),
              },
            },
            {
              createdAt: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate + 'T23:59:59.999Z') }),
              },
            },
          ];
        }

        bookings = await bookingsColl.find(filter).toArray();
      }
    } catch (bErr) {
      console.log('Error querying coordination bookings:', bErr.message);
    }

    // 3. Aggregate stats for Colombo & Gampaha
    const activeStats = {
      Colombo: { demand: 0, supply: 0 },
      Gampaha: { demand: 0, supply: 0 },
    };

    bookings.forEach((b) => {
      const seekerIdStr = b.seekerId ? b.seekerId.toString() : null;
      let seekerDistrict = seekerIdStr && seekerDistrictMap[seekerIdStr] ? seekerDistrictMap[seekerIdStr] : '';

      // Fallback to booking location if seeker district missing
      if (!seekerDistrict && b.location) {
        seekerDistrict = b.location.city || b.location.address || '';
      }

      // Check Colombo
      if (/colombo/i.test(seekerDistrict)) {
        activeStats.Colombo.demand += 1;
        if (b.bookingStatus === 'COMPLETED' || b.bookingStatus === 'Completed') {
          activeStats.Colombo.supply += 1;
        }
      }
      // Check Gampaha
      else if (/gampaha/i.test(seekerDistrict)) {
        activeStats.Gampaha.demand += 1;
        if (b.bookingStatus === 'COMPLETED' || b.bookingStatus === 'Completed') {
          activeStats.Gampaha.supply += 1;
        }
      }
    });

    // 4. Build response array: Colombo & Gampaha first, followed by other districts
    const districtData = ALL_SRI_LANKA_DISTRICTS.map((districtName) => {
      const isActive = districtName === 'Colombo' || districtName === 'Gampaha';
      
      if (isActive) {
        const stats = activeStats[districtName];
        const demand = stats.demand;
        const supply = stats.supply;
        const percentage = demand > 0 ? Number(((supply / demand) * 100).toFixed(2)) : 0.0;
        const isCritical = percentage < 75;

        return {
          district: districtName,
          demand,
          supply,
          percentage,
          status: isCritical ? 'Critical' : 'Stable',
          color: isCritical ? '#ef4444' : '#3b82f6', // Red if < 75%, Blue if >= 75%
          isAvailable: true,
          message: isCritical ? 'Supply is below 75% threshold' : 'Supply is stable (>= 75%)',
        };
      } else {
        return {
          district: districtName,
          demand: 0,
          supply: 0,
          percentage: 0,
          status: 'Coming soon...',
          color: '#eab308', // Yellow
          isAvailable: false,
          message: 'Coming soon...',
        };
      }
    });

    // 5. Total Country Overview Calculations
    const totalDemand = activeStats.Colombo.demand + activeStats.Gampaha.demand;
    const totalSupply = activeStats.Colombo.supply + activeStats.Gampaha.supply;
    const overallPercentage = totalDemand > 0 ? Number(((totalSupply / totalDemand) * 100).toFixed(2)) : 0.0;
    const districtsBelow75 = (activeStats.Colombo.demand > 0 && (activeStats.Colombo.supply / activeStats.Colombo.demand) * 100 < 75 ? 1 : 0) +
      (activeStats.Gampaha.demand > 0 && (activeStats.Gampaha.supply / activeStats.Gampaha.demand) * 100 < 75 ? 1 : 0);

    const totalOverview = [
      {
        name: 'Total Country',
        Demand: totalDemand,
        Supply: totalSupply,
        Percentage: overallPercentage,
      },
      {
        name: 'Colombo',
        Demand: activeStats.Colombo.demand,
        Supply: activeStats.Colombo.supply,
        Percentage: activeStats.Colombo.demand > 0 ? Number(((activeStats.Colombo.supply / activeStats.Colombo.demand) * 100).toFixed(2)) : 0.0,
      },
      {
        name: 'Gampaha',
        Demand: activeStats.Gampaha.demand,
        Supply: activeStats.Gampaha.supply,
        Percentage: activeStats.Gampaha.demand > 0 ? Number(((activeStats.Gampaha.supply / activeStats.Gampaha.demand) * 100).toFixed(2)) : 0.0,
      },
    ];

    return res.status(200).json({
      success: true,
      data: districtData,
      totalOverview,
      summary: {
        totalDemand,
        totalSupply,
        avgSupplyPercentage: overallPercentage,
        districtsBelow75,
        activeDistrictsCount: 2,
        totalDistrictsCount: ALL_SRI_LANKA_DISTRICTS.length,
      },
    });
  } catch (error) {
    console.error('getDemandSupplyAnalytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch demand-supply analytics',
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/booking-growth
 * Aggregates real monthly booking growth from PP1.bookings
 */
exports.getBookingGrowthAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, district } = req.query;

    const coordConn = await getCoordinationConnection();
    let bookings = [];
    if (coordConn) {
      let filter = {};
      if (startDate || endDate) {
        filter.$or = [
          {
            scheduledDate: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate }),
            },
          },
          {
            createdAt: {
              ...(startDate && { $gte: new Date(startDate) }),
              ...(endDate && { $lte: new Date(endDate + 'T23:59:59.999Z') }),
            },
          },
        ];
      }

      bookings = await coordConn.collection('bookings').find(filter).toArray();
    }

    // Build Seeker ID -> District mapping to accurately match bookings to districts
    let seekers = [];
    if (mongoose.connection && mongoose.connection.db) {
      seekers = await mongoose.connection.db.collection('seekers').find({}, { projection: { _id: 1, district: 1 } }).toArray();
    }
    const seekerDistrictMap = {};
    seekers.forEach((s) => {
      if (s._id) seekerDistrictMap[s._id.toString()] = (s.district || '').trim().toLowerCase();
    });

    if (district && district !== 'All' && district !== 'All Districts') {
      const targetDist = district.trim().toLowerCase();
      bookings = bookings.filter((b) => {
        const sDist = b.seekerId ? seekerDistrictMap[b.seekerId.toString()] : '';
        const locDist = (b.location?.district || b.location?.city || b.location?.address || '').toLowerCase();
        return sDist === targetDist || locDist.includes(targetDist);
      });
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Determine the year to display (default to current year e.g. 2026)
    const targetYear = startDate ? new Date(startDate).getFullYear() : (bookings[0]?.createdAt ? new Date(bookings[0].createdAt).getFullYear() : new Date().getFullYear());

    // Initialize 12 months data
    const monthlyMap = {};
    monthNames.forEach((name, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const dateKey = `${targetYear}-${monthNum}-01`;
      monthlyMap[idx] = {
        name,
        date: dateKey,
        monthIndex: idx,
        bookings: 0, // Completed bookings for bar chart
        totalBookings: 0, // All bookings
        completedBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
      };
    });

    let totalCompleted = 0;
    let totalAll = 0;

    bookings.forEach((b) => {
      totalAll += 1;
      let bDate = null;
      if (b.scheduledDate && typeof b.scheduledDate === 'string') {
        const parts = b.scheduledDate.split('-');
        if (parts.length === 3) {
          bDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          bDate = new Date(b.scheduledDate);
        }
      } else if (b.createdAt) {
        bDate = new Date(b.createdAt);
      }

      if (bDate && !isNaN(bDate.getTime())) {
        const mIdx = bDate.getMonth();
        if (monthlyMap[mIdx]) {
          monthlyMap[mIdx].totalBookings += 1;
          const status = (b.bookingStatus || '').toUpperCase();
          if (status === 'COMPLETED') {
            monthlyMap[mIdx].completedBookings += 1;
            monthlyMap[mIdx].bookings += 1;
            totalCompleted += 1;
          } else if (status === 'CONFIRMED') {
            monthlyMap[mIdx].confirmedBookings += 1;
          } else if (status === 'CANCELLED') {
            monthlyMap[mIdx].cancelledBookings += 1;
          }
        }
      }
    });

    const monthlyData = Object.values(monthlyMap).sort((a, b) => a.monthIndex - b.monthIndex);

    return res.status(200).json({
      success: true,
      data: monthlyData,
      summary: {
        totalAllBookings: totalAll,
        totalCompletedBookings: totalCompleted,
        year: targetYear,
      },
    });
  } catch (error) {
    console.error('getBookingGrowthAnalytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch booking growth analytics',
      error: error.message,
    });
  }
};

exports.getUserGrowthAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, district } = req.query;

    let seekers = [];
    let providers = [];

    if (mongoose.connection && mongoose.connection.db) {
      seekers = await mongoose.connection.db.collection('seekers').find({}).toArray();
      providers = await mongoose.connection.db.collection('providers').find({}).toArray();
    }

    if (district && district !== 'All' && district !== 'All Districts') {
      const targetDist = district.trim().toLowerCase();
      seekers = seekers.filter((s) => (s.district || '').trim().toLowerCase() === targetDist);
      providers = providers.filter((p) => (p.district || '').trim().toLowerCase() === targetDist);
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const targetYear = startDate ? new Date(startDate).getFullYear() : (seekers[0]?.createdAt ? new Date(seekers[0].createdAt).getFullYear() : new Date().getFullYear());

    // Initialize 12 months data
    const monthlyMap = {};
    monthNames.forEach((name, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const dateKey = `${targetYear}-${monthNum}-01`;
      monthlyMap[idx] = {
        name,
        monthIndex: idx,
        date: dateKey,
        newSeekers: 0,
        newProviders: 0,
        seekers: 0,
        providers: 0,
        totalUsers: 0,
      };
    });

    // Populate new user registrations per month
    seekers.forEach((s) => {
      const d = s.createdAt ? new Date(s.createdAt) : null;
      if (d && !isNaN(d.getTime())) {
        const mIdx = d.getMonth();
        if (monthlyMap[mIdx]) {
          monthlyMap[mIdx].newSeekers += 1;
        }
      } else {
        monthlyMap[0].newSeekers += 1;
      }
    });

    providers.forEach((p) => {
      const d = p.createdAt ? new Date(p.createdAt) : null;
      if (d && !isNaN(d.getTime())) {
        const mIdx = d.getMonth();
        if (monthlyMap[mIdx]) {
          monthlyMap[mIdx].newProviders += 1;
        }
      } else {
        monthlyMap[0].newProviders += 1;
      }
    });

    // Cumulative growth calculation across the year
    let runningSeekers = 0;
    let runningProviders = 0;

    const monthlyData = Object.values(monthlyMap)
      .sort((a, b) => a.monthIndex - b.monthIndex)
      .map((m) => {
        runningSeekers += m.newSeekers;
        runningProviders += m.newProviders;
        return {
          ...m,
          seekers: runningSeekers,
          providers: runningProviders,
          totalUsers: runningSeekers + runningProviders,
        };
      });

    return res.status(200).json({
      success: true,
      data: monthlyData,
      summary: {
        totalSeekers: seekers.length,
        totalProviders: providers.length,
        totalUsers: seekers.length + providers.length,
        year: targetYear,
      },
    });
  } catch (error) {
    console.error('getUserGrowthAnalytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user growth analytics',
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/revenue-growth
 * Fetches combined revenue growth, ad boosting income, and service booking commission earnings (5%)
 */
exports.getRevenueGrowthAnalytics = async (req, res) => {
  try {
    const { district } = req.query;
    const axios = require('axios');
    const providerServiceUrl = process.env.PROVIDER_SERVICE_URL || 'http://localhost:3002';
    
    // 1. If district is specified, lookup provider IDs belonging to that district from FinanceManagement.providers
    let targetProviderIds = null;
    const providerDistrictMap = {};
    if (mongoose.connection && mongoose.connection.db) {
      try {
        const allProviders = await mongoose.connection.db.collection('providers').find({}, { projection: { _id: 1, district: 1 } }).toArray();
        allProviders.forEach(p => {
          if (p._id) providerDistrictMap[p._id.toString()] = p.district || 'Colombo';
        });

        if (district && district !== 'All' && district !== 'All Districts') {
          const matched = allProviders.filter(p => (p.district || '').toLowerCase() === district.trim().toLowerCase());
          targetProviderIds = matched.map(p => p._id.toString());
        }
      } catch (pErr) {
        console.log('Error querying providers for revenue district filter:', pErr.message);
      }
    }

    const currentYear = new Date().getFullYear();
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const monthlyMap = {};
    for (let i = 1; i <= 12; i++) {
      monthlyMap[i] = {
        totalRevenue: 0,
        boostRevenue: 0,
        commissionRevenue: 0,
        serviceVolume: 0,
        boostTransactions: 0,
        bookingTransactions: 0,
        totalTransactions: 0,
        boostSteps: 0,
      };
    }

    let totalBoostRevenue = 0;
    let totalBoostTransactions = 0;
    let totalBoostSteps = 0;

    // A. Fetch Ad Boosting Transactions from Provider Service or Provider DB
    try {
      const providerMongoUri = process.env.PROVIDER_MONGO_URI || 'mongodb+srv://jkumarasekara_db_user:vfDFrozTabkpXDCl@cluster0.xggs3th.mongodb.net/Provider_Service?retryWrites=true&w=majority';
      const providerConn = await mongoose.createConnection(providerMongoUri).asPromise();

      const boostQuery = { status: 'completed' };
      if (targetProviderIds && targetProviderIds.length > 0) {
        boostQuery.providerId = { $in: targetProviderIds };
      }

      const boostTxList = await providerConn.collection('transactions').find(boostQuery).toArray();
      boostTxList.forEach(tx => {
        const txDate = new Date(tx.createdAt || tx.updatedAt || Date.now());
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth() + 1;
        const amount = Number(tx.amountPaid) || 0;
        const steps = Number(tx.boostAmount) || 0;

        totalBoostRevenue += amount;
        totalBoostTransactions += 1;
        totalBoostSteps += steps;

        if (txYear === currentYear && monthlyMap[txMonth]) {
          monthlyMap[txMonth].boostRevenue += amount;
          monthlyMap[txMonth].boostTransactions += 1;
          monthlyMap[txMonth].boostSteps += steps;
        }
      });
    } catch (dbErr) {
      console.log('Provider DB direct query note for boosts:', dbErr.message);
      // Fallback via HTTP API
      try {
        const params = {};
        if (district && district !== 'All') params.district = district;
        if (targetProviderIds !== null) params.providerIds = targetProviderIds.join(',');
        const response = await axios.get(`${providerServiceUrl}/api/provider/ads/income/total`, { params, timeout: 3500 });
        if (response.data && response.data.success && response.data.data) {
          const rData = response.data.data;
          totalBoostRevenue = rData.totalIncomeLkr || 0;
          totalBoostTransactions = rData.totalTransactions || 0;
          totalBoostSteps = rData.totalBoostSteps || 0;
          (rData.monthlyBreakdown || []).forEach((m, idx) => {
            const mIdx = idx + 1;
            if (monthlyMap[mIdx]) {
              monthlyMap[mIdx].boostRevenue = Number(m.revenue) || 0;
              monthlyMap[mIdx].boostTransactions = Number(m.transactions) || 0;
              monthlyMap[mIdx].boostSteps = Number(m.boostSteps) || 0;
            }
          });
        }
      } catch (apiErr) {
        console.log('Provider service call error in revenue growth analytics:', apiErr.message);
      }
    }

    // B. Fetch Service Booking Commission (5%) from Coordination Database
    let totalCommissionRevenue = 0;
    let totalBookingVolume = 0;
    let totalCompletedBookings = 0;

    try {
      const coordConn = await getCoordinationConnection();
      if (coordConn && coordConn.db) {
        const bookingList = await coordConn.db.collection('bookings').find({}).toArray();
        bookingList.forEach(b => {
          const isCompleted = b.bookingStatus === 'COMPLETED' || b.bookingStatus === 'CONFIRMED' || (!b.bookingStatus && b.finalAmount);
          if (isCompleted) {
            const pId = b.providerId ? b.providerId.toString() : '';
            const pDistrict = providerDistrictMap[pId] || b.location?.district || 'Colombo';

            // District filter match
            if (district && district !== 'All' && district !== 'All Districts') {
              if (pDistrict.toLowerCase() !== district.trim().toLowerCase()) return;
            }

            const rawDate = b.scheduledDate || b.initialSchedule?.date || (b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : '2026-08-01');
            const bDate = new Date(rawDate);
            const bYear = bDate.getFullYear();
            const bMonth = bDate.getMonth() + 1;

            const finalAmount = Number(b.finalAmount) || 2500; // standard booking service value
            const commission = Math.round(finalAmount * 0.05 * 100) / 100; // 5% platform commission

            totalBookingVolume += finalAmount;
            totalCommissionRevenue += commission;
            totalCompletedBookings += 1;

            if (bYear === currentYear && monthlyMap[bMonth]) {
              monthlyMap[bMonth].commissionRevenue += commission;
              monthlyMap[bMonth].serviceVolume += finalAmount;
              monthlyMap[bMonth].bookingTransactions += 1;
            }
          }
        });
      }
    } catch (bErr) {
      console.log('Coordination DB query note in revenue analytics:', bErr.message);
    }

    // C. Combine both streams into final monthly breakdown
    const monthlyBreakdown = MONTH_NAMES.map((monthName, idx) => {
      const monthNum = idx + 1;
      const data = monthlyMap[monthNum] || {};
      const boostRev = Math.round((data.boostRevenue || 0) * 100) / 100;
      const commRev = Math.round((data.commissionRevenue || 0) * 100) / 100;
      const combinedTotal = Math.round((boostRev + commRev) * 100) / 100;
      const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;

      return {
        name: monthName,
        month: monthName,
        monthIndex: monthNum,
        year: currentYear,
        date: `${currentYear}-${monthStr}-01`,
        revenue: combinedTotal, // Default combined total for area chart
        totalRevenue: combinedTotal,
        boostRevenue: boostRev,
        commissionRevenue: commRev,
        serviceVolume: Math.round((data.serviceVolume || 0) * 100) / 100,
        boostTransactions: data.boostTransactions || 0,
        bookingTransactions: data.bookingTransactions || 0,
        totalTransactions: (data.boostTransactions || 0) + (data.bookingTransactions || 0),
        transactions: (data.boostTransactions || 0) + (data.bookingTransactions || 0),
        boostSteps: data.boostSteps || 0,
      };
    });

    const totalIncomeLkr = Math.round((totalBoostRevenue + totalCommissionRevenue) * 100) / 100;
    const totalTransactions = totalBoostTransactions + totalCompletedBookings;

    return res.status(200).json({
      success: true,
      data: {
        totalIncomeLkr,
        totalRevenue: totalIncomeLkr,
        totalBoostRevenue: Math.round(totalBoostRevenue * 100) / 100,
        totalCommissionRevenue: Math.round(totalCommissionRevenue * 100) / 100,
        totalBookingVolume: Math.round(totalBookingVolume * 100) / 100,
        totalTransactions,
        totalBoostTransactions,
        totalCompletedBookings,
        totalBoostSteps,
        currency: 'LKR',
        monthlyBreakdown,
      },
    });
  } catch (error) {
    console.error('getRevenueGrowthAnalytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
      error: error.message,
    });
  }
};


