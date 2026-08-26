import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  FiFileText, FiDownload, FiCalendar, FiFilter, FiTrendingUp, 
  FiUsers, FiLayers, FiCheckCircle, FiClock, FiXCircle, 
  FiPrinter, FiRefreshCw, FiPieChart, FiBarChart2, FiShare2
} from 'react-icons/fi';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ADMIN_SERVICE_URL } from '../config';
import './ReportsPage.css';

const REPORT_TYPES = [
  {
    id: 'all-vs-completed',
    title: 'All Bookings vs Completed Bookings',
    description: 'Volume comparison of total requested bookings versus successfully completed service bookings.',
    icon: FiCheckCircle,
    category: 'Booking Analytics',
    themeColor: '#059669',
  },
  {
    id: 'all-vs-confirmed',
    title: 'All Bookings vs Confirmed Bookings',
    description: 'Analysis of scheduled and actively confirmed service bookings against overall demand.',
    icon: FiClock,
    category: 'Booking Analytics',
    themeColor: '#2563eb',
  },
  {
    id: 'all-vs-cancelled',
    title: 'All Bookings vs Cancelled Bookings',
    description: 'Evaluation of booking drop-offs, missed appointments, and cancellation ratios.',
    icon: FiXCircle,
    category: 'Booking Analytics',
    themeColor: '#e11d48',
  },
  {
    id: 'comprehensive-booking',
    title: 'Master Service Booking & Status Report',
    description: 'Complete cross-sectional breakdown of total, completed, confirmed, and cancelled services.',
    icon: FiLayers,
    category: 'Master Reports',
    themeColor: '#4f46e5',
  },
  {
    id: 'user-growth',
    title: 'User & Provider Growth Report',
    description: 'Platform user acquisition metrics comparing service seekers versus service providers.',
    icon: FiUsers,
    category: 'User Analytics',
    themeColor: '#8b5cf6',
  },
];

const PRESETS = [
  { label: 'Full Year 2026', start: '2026-01-01', end: '2026-12-31' },
  { label: 'Q1 (Jan - Mar)', start: '2026-01-01', end: '2026-03-31' },
  { label: 'Q2 (Apr - Jun)', start: '2026-04-01', end: '2026-06-30' },
  { label: 'Q3 (Jul - Sep)', start: '2026-07-01', end: '2026-09-30' },
  { label: 'Q4 (Oct - Dec)', start: '2026-10-01', end: '2026-12-31' },
  { label: 'Last 6 Months', start: '2026-03-01', end: '2026-08-31' },
];

const ReportsPage = () => {
  const [selectedReportId, setSelectedReportId] = useState('all-vs-completed');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [activePreset, setActivePreset] = useState('Full Year 2026');
  
  const [bookingData, setBookingData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState(new Date());

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const currentReport = REPORT_TYPES.find((r) => r.id === selectedReportId) || REPORT_TYPES[0];

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingRes, userRes] = await Promise.all([
        axios.get(`${ADMIN_SERVICE_URL}/api/analytics/booking-growth`, {
          params: { startDate, endDate },
        }),
        axios.get(`${ADMIN_SERVICE_URL}/api/analytics/user-growth`, {
          params: { startDate, endDate },
        }),
      ]);

      if (bookingRes.data && bookingRes.data.success) {
        setBookingData(bookingRes.data.data || []);
      }
      if (userRes.data && userRes.data.success) {
        setUserData(userRes.data.data || []);
      }
      setLastGeneratedAt(new Date());
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Handle Preset selection
  const handlePresetSelect = (preset) => {
    setActivePreset(preset.label);
    setStartDate(preset.start);
    setEndDate(preset.end);
  };

  // Filter months matching date range if custom
  const filteredData = useMemo(() => {
    if (!startDate && !endDate) return selectedReportId === 'user-growth' ? userData : bookingData;

    const startMonth = startDate ? new Date(startDate).getMonth() : 0;
    const endMonth = endDate ? new Date(endDate).getMonth() : 11;

    const sourceData = selectedReportId === 'user-growth' ? userData : bookingData;
    return sourceData.filter((d) => d.monthIndex >= startMonth && d.monthIndex <= endMonth);
  }, [selectedReportId, userData, bookingData, startDate, endDate]);

  // Summary Metrics calculations
  const summaryMetrics = useMemo(() => {
    if (selectedReportId === 'user-growth') {
      const totalSeekers = filteredData.reduce((acc, d) => acc + (d.newSeekers || 0), 0);
      const totalProviders = filteredData.reduce((acc, d) => acc + (d.newProviders || 0), 0);
      const totalNewUsers = totalSeekers + totalProviders;
      const latestMonth = filteredData[filteredData.length - 1] || {};
      const cumulativeUsers = latestMonth.totalUsers || totalNewUsers;

      return {
        metric1: { label: 'New Seekers Registered', value: totalSeekers, color: '#8b5cf6' },
        metric2: { label: 'New Providers Registered', value: totalProviders, color: '#10b981' },
        metric3: { label: 'Total Platform User Base', value: cumulativeUsers, color: '#4f46e5' },
        metric4: { 
          label: 'Provider-to-Seeker Ratio', 
          value: totalSeekers > 0 ? `1 : ${(totalSeekers / (totalProviders || 1)).toFixed(1)}` : 'N/A', 
          color: '#0284c7' 
        },
      };
    }

    // Booking Analytics Metrics
    const totalAll = filteredData.reduce((acc, d) => acc + (d.totalBookings || 0), 0);
    const totalCompleted = filteredData.reduce((acc, d) => acc + (d.completedBookings || 0), 0);
    const totalConfirmed = filteredData.reduce((acc, d) => acc + (d.confirmedBookings || 0), 0);
    const totalCancelled = filteredData.reduce((acc, d) => acc + (d.cancelledBookings || 0), 0);

    const completionRate = totalAll > 0 ? ((totalCompleted / totalAll) * 100).toFixed(1) + '%' : '0.0%';
    const confirmationRate = totalAll > 0 ? ((totalConfirmed / totalAll) * 100).toFixed(1) + '%' : '0.0%';
    const cancellationRate = totalAll > 0 ? ((totalCancelled / totalAll) * 100).toFixed(1) + '%' : '0.0%';

    if (selectedReportId === 'all-vs-completed') {
      return {
        metric1: { label: 'Total Demand Volume', value: totalAll, color: '#4f46e5' },
        metric2: { label: 'Completed Fulfillments', value: totalCompleted, color: '#059669' },
        metric3: { label: 'Completion Success Rate', value: completionRate, color: '#059669' },
        metric4: { label: 'Avg Monthly Bookings', value: (totalAll / (filteredData.length || 1)).toFixed(1), color: '#0284c7' },
      };
    } else if (selectedReportId === 'all-vs-confirmed') {
      return {
        metric1: { label: 'Total Demand Volume', value: totalAll, color: '#4f46e5' },
        metric2: { label: 'Confirmed Bookings', value: totalConfirmed, color: '#2563eb' },
        metric3: { label: 'Confirmation Rate', value: confirmationRate, color: '#2563eb' },
        metric4: { label: 'Active Pipeline Ratio', value: totalAll > 0 ? `${((totalConfirmed / totalAll) * 100).toFixed(1)}%` : '0%', color: '#0284c7' },
      };
    } else if (selectedReportId === 'all-vs-cancelled') {
      return {
        metric1: { label: 'Total Demand Volume', value: totalAll, color: '#4f46e5' },
        metric2: { label: 'Cancelled Bookings', value: totalCancelled, color: '#e11d48' },
        metric3: { label: 'Cancellation Drop Rate', value: cancellationRate, color: '#e11d48' },
        metric4: { label: 'Retained Fulfillments', value: totalAll - totalCancelled, color: '#059669' },
      };
    } else {
      // comprehensive-booking
      return {
        metric1: { label: 'Total Service Demand', value: totalAll, color: '#4f46e5' },
        metric2: { label: 'Completed (Fulfillments)', value: totalCompleted, color: '#059669' },
        metric3: { label: 'Active / Confirmed', value: totalConfirmed, color: '#2563eb' },
        metric4: { label: 'Drop-off / Cancelled', value: totalCancelled, color: '#e11d48' },
      };
    }
  }, [selectedReportId, filteredData]);

  // ===================== EXPORT HANDLERS =====================

  // 1. PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const nowStr = new Date().toLocaleString();
    const adminName = adminUser.fullName || 'Authorized Admin';

    // Header Branding
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('WORKWAVE ADMINISTRATION - EXECUTIVE REPORT', 14, 15);

    // Meta Box
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated By: ${adminName}`, 14, 32);
    doc.text(`Generated Date: ${nowStr}`, 14, 37);
    doc.text(`Time Period: ${startDate} to ${endDate} (${activePreset})`, 14, 42);
    doc.text(`Report Subject: ${currentReport.title}`, 14, 47);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 51, 196, 51);

    // Executive Summary Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 55, 182, 28, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('EXECUTIVE METRICS SUMMARY', 18, 62);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${summaryMetrics.metric1.label}: ${summaryMetrics.metric1.value}`, 18, 70);
    doc.text(`${summaryMetrics.metric2.label}: ${summaryMetrics.metric2.value}`, 18, 76);
    doc.text(`${summaryMetrics.metric3.label}: ${summaryMetrics.metric3.value}`, 110, 70);
    doc.text(`${summaryMetrics.metric4.label}: ${summaryMetrics.metric4.value}`, 110, 76);

    // Table Content
    let tableHeaders = [];
    let tableRows = [];

    if (selectedReportId === 'user-growth') {
      tableHeaders = ['Month', 'New Seekers', 'New Providers', 'Total Cumulative Users'];
      tableRows = filteredData.map((d) => [
        d.name,
        d.newSeekers || 0,
        d.newProviders || 0,
        d.totalUsers || 0,
      ]);
      const totalSeekers = filteredData.reduce((a, b) => a + (b.newSeekers || 0), 0);
      const totalProviders = filteredData.reduce((a, b) => a + (b.newProviders || 0), 0);
      const latestTotal = filteredData[filteredData.length - 1]?.totalUsers || (totalSeekers + totalProviders);
      tableRows.push(['TOTAL', totalSeekers, totalProviders, latestTotal]);
    } else if (selectedReportId === 'all-vs-completed') {
      tableHeaders = ['Month', 'All Bookings', 'Completed Bookings', 'Completion Rate (%)'];
      tableRows = filteredData.map((d) => {
        const rate = d.totalBookings > 0 ? ((d.completedBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%';
        return [d.name, d.totalBookings || 0, d.completedBookings || 0, rate];
      });
      const tAll = filteredData.reduce((a, b) => a + (b.totalBookings || 0), 0);
      const tComp = filteredData.reduce((a, b) => a + (b.completedBookings || 0), 0);
      const tRate = tAll > 0 ? ((tComp / tAll) * 100).toFixed(1) + '%' : '0.0%';
      tableRows.push(['TOTAL', tAll, tComp, tRate]);
    } else if (selectedReportId === 'all-vs-confirmed') {
      tableHeaders = ['Month', 'All Bookings', 'Confirmed Bookings', 'Confirmation Rate (%)'];
      tableRows = filteredData.map((d) => {
        const rate = d.totalBookings > 0 ? ((d.confirmedBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%';
        return [d.name, d.totalBookings || 0, d.confirmedBookings || 0, rate];
      });
      const tAll = filteredData.reduce((a, b) => a + (b.totalBookings || 0), 0);
      const tConf = filteredData.reduce((a, b) => a + (b.confirmedBookings || 0), 0);
      const tRate = tAll > 0 ? ((tConf / tAll) * 100).toFixed(1) + '%' : '0.0%';
      tableRows.push(['TOTAL', tAll, tConf, tRate]);
    } else if (selectedReportId === 'all-vs-cancelled') {
      tableHeaders = ['Month', 'All Bookings', 'Cancelled Bookings', 'Cancellation Rate (%)'];
      tableRows = filteredData.map((d) => {
        const rate = d.totalBookings > 0 ? ((d.cancelledBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%';
        return [d.name, d.totalBookings || 0, d.cancelledBookings || 0, rate];
      });
      const tAll = filteredData.reduce((a, b) => a + (b.totalBookings || 0), 0);
      const tCanc = filteredData.reduce((a, b) => a + (b.cancelledBookings || 0), 0);
      const tRate = tAll > 0 ? ((tCanc / tAll) * 100).toFixed(1) + '%' : '0.0%';
      tableRows.push(['TOTAL', tAll, tCanc, tRate]);
    } else {
      tableHeaders = ['Month', 'Total Demand', 'Completed', 'Confirmed', 'Cancelled', 'Success Rate'];
      tableRows = filteredData.map((d) => {
        const rate = d.totalBookings > 0 ? ((d.completedBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%';
        return [d.name, d.totalBookings || 0, d.completedBookings || 0, d.confirmedBookings || 0, d.cancelledBookings || 0, rate];
      });
      const tAll = filteredData.reduce((a, b) => a + (b.totalBookings || 0), 0);
      const tComp = filteredData.reduce((a, b) => a + (b.completedBookings || 0), 0);
      const tConf = filteredData.reduce((a, b) => a + (b.confirmedBookings || 0), 0);
      const tCanc = filteredData.reduce((a, b) => a + (b.cancelledBookings || 0), 0);
      const tRate = tAll > 0 ? ((tComp / tAll) * 100).toFixed(1) + '%' : '0.0%';
      tableRows.push(['TOTAL', tAll, tComp, tConf, tCanc, tRate]);
    }

    autoTable(doc, {
      startY: 89,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`WorkWave Admin System - Confidential Analytics Report | Page ${i} of ${pageCount}`, 14, 287);
    }

    const filename = `${selectedReportId}_report_${startDate}_to_${endDate}.pdf`;
    doc.save(filename);
  };

  // 2. Word Document Export (.doc HTML format)
  const handleExportWord = () => {
    const nowStr = new Date().toLocaleString();
    const adminName = adminUser.fullName || 'Authorized Admin';

    let tableHeadersHtml = '';
    let tableRowsHtml = '';

    if (selectedReportId === 'user-growth') {
      tableHeadersHtml = '<th>Month</th><th>New Seekers</th><th>New Providers</th><th>Total Cumulative Users</th>';
      tableRowsHtml = filteredData.map(d => `
        <tr>
          <td>${d.name}</td>
          <td>${d.newSeekers || 0}</td>
          <td>${d.newProviders || 0}</td>
          <td>${d.totalUsers || 0}</td>
        </tr>
      `).join('');
    } else if (selectedReportId === 'all-vs-completed') {
      tableHeadersHtml = '<th>Month</th><th>All Bookings</th><th>Completed Bookings</th><th>Completion Rate (%)</th>';
      tableRowsHtml = filteredData.map(d => `
        <tr>
          <td>${d.name}</td>
          <td>${d.totalBookings || 0}</td>
          <td>${d.completedBookings || 0}</td>
          <td>${d.totalBookings > 0 ? ((d.completedBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%'}</td>
        </tr>
      `).join('');
    } else if (selectedReportId === 'all-vs-confirmed') {
      tableHeadersHtml = '<th>Month</th><th>All Bookings</th><th>Confirmed Bookings</th><th>Confirmation Rate (%)</th>';
      tableRowsHtml = filteredData.map(d => `
        <tr>
          <td>${d.name}</td>
          <td>${d.totalBookings || 0}</td>
          <td>${d.confirmedBookings || 0}</td>
          <td>${d.totalBookings > 0 ? ((d.confirmedBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%'}</td>
        </tr>
      `).join('');
    } else if (selectedReportId === 'all-vs-cancelled') {
      tableHeadersHtml = '<th>Month</th><th>All Bookings</th><th>Cancelled Bookings</th><th>Cancellation Rate (%)</th>';
      tableRowsHtml = filteredData.map(d => `
        <tr>
          <td>${d.name}</td>
          <td>${d.totalBookings || 0}</td>
          <td>${d.cancelledBookings || 0}</td>
          <td>${d.totalBookings > 0 ? ((d.cancelledBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%'}</td>
        </tr>
      `).join('');
    } else {
      tableHeadersHtml = '<th>Month</th><th>Total Demand</th><th>Completed</th><th>Confirmed</th><th>Cancelled</th><th>Success Rate</th>';
      tableRowsHtml = filteredData.map(d => `
        <tr>
          <td>${d.name}</td>
          <td>${d.totalBookings || 0}</td>
          <td>${d.completedBookings || 0}</td>
          <td>${d.confirmedBookings || 0}</td>
          <td>${d.cancelledBookings || 0}</td>
          <td>${d.totalBookings > 0 ? ((d.completedBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%'}</td>
        </tr>
      `).join('');
    }

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${currentReport.title}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; margin: 24px; color: #1e293b; }
          h1 { color: #4338ca; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
          .meta-box { background: #f1f5f9; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; }
          .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .kpi-table td { padding: 10px; background: #eef2ff; border: 1px solid #c7d2fe; text-align: center; }
          .kpi-val { font-size: 18px; font-weight: bold; color: #4338ca; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          .data-table th { background: #4f46e5; color: #ffffff; padding: 10px; text-align: left; border: 1px solid #e2e8f0; }
          .data-table td { padding: 8px 10px; border: 1px solid #e2e8f0; }
          .data-table tr:nth-child(even) { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>WorkWave - ${currentReport.title}</h1>
        <div class="meta-box">
          <p><strong>Generated By:</strong> ${adminName}</p>
          <p><strong>Generated At:</strong> ${nowStr}</p>
          <p><strong>Time Period:</strong> ${startDate} to ${endDate} (${activePreset})</p>
          <p><strong>Description:</strong> ${currentReport.description}</p>
        </div>

        <table class="kpi-table">
          <tr>
            <td><div>${summaryMetrics.metric1.label}</div><div class="kpi-val">${summaryMetrics.metric1.value}</div></td>
            <td><div>${summaryMetrics.metric2.label}</div><div class="kpi-val">${summaryMetrics.metric2.value}</div></td>
            <td><div>${summaryMetrics.metric3.label}</div><div class="kpi-val">${summaryMetrics.metric3.value}</div></td>
            <td><div>${summaryMetrics.metric4.label}</div><div class="kpi-val">${summaryMetrics.metric4.value}</div></td>
          </tr>
        </table>

        <h3>Detailed Monthly Breakdown Data</h3>
        <table class="data-table">
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + docContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReportId}_report_${startDate}_to_${endDate}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. Text / TXT Export
  const handleExportTXT = () => {
    const nowStr = new Date().toLocaleString();
    const adminName = adminUser.fullName || 'Authorized Admin';

    let txtContent = `========================================================================\n`;
    txtContent += `WORKWAVE ADMINISTRATION - EXECUTIVE ANALYTICS REPORT\n`;
    txtContent += `========================================================================\n\n`;
    txtContent += `Report Title  : ${currentReport.title}\n`;
    txtContent += `Generated By  : ${adminName}\n`;
    txtContent += `Generated Date: ${nowStr}\n`;
    txtContent += `Time Period   : ${startDate} to ${endDate} (${activePreset})\n`;
    txtContent += `Description   : ${currentReport.description}\n\n`;

    txtContent += `------------------------------------------------------------------------\n`;
    txtContent += `EXECUTIVE SUMMARY METRICS\n`;
    txtContent += `------------------------------------------------------------------------\n`;
    txtContent += `* ${summaryMetrics.metric1.label.padEnd(30)}: ${summaryMetrics.metric1.value}\n`;
    txtContent += `* ${summaryMetrics.metric2.label.padEnd(30)}: ${summaryMetrics.metric2.value}\n`;
    txtContent += `* ${summaryMetrics.metric3.label.padEnd(30)}: ${summaryMetrics.metric3.value}\n`;
    txtContent += `* ${summaryMetrics.metric4.label.padEnd(30)}: ${summaryMetrics.metric4.value}\n\n`;

    txtContent += `------------------------------------------------------------------------\n`;
    txtContent += `MONTHLY BREAKDOWN DATA TABLE\n`;
    txtContent += `------------------------------------------------------------------------\n`;

    if (selectedReportId === 'user-growth') {
      txtContent += `| Month | New Seekers | New Providers | Total Users |\n`;
      txtContent += `|-------|-------------|---------------|-------------|\n`;
      filteredData.forEach((d) => {
        txtContent += `| ${d.name.padEnd(5)} | ${String(d.newSeekers || 0).padEnd(11)} | ${String(d.newProviders || 0).padEnd(13)} | ${String(d.totalUsers || 0).padEnd(11)} |\n`;
      });
    } else if (selectedReportId === 'all-vs-completed') {
      txtContent += `| Month | All Bookings | Completed Bookings | Completion Rate |\n`;
      txtContent += `|-------|--------------|--------------------|-----------------|\n`;
      filteredData.forEach((d) => {
        const rate = d.totalBookings > 0 ? ((d.completedBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%';
        txtContent += `| ${d.name.padEnd(5)} | ${String(d.totalBookings || 0).padEnd(12)} | ${String(d.completedBookings || 0).padEnd(18)} | ${rate.padEnd(15)} |\n`;
      });
    } else if (selectedReportId === 'all-vs-confirmed') {
      txtContent += `| Month | All Bookings | Confirmed Bookings | Confirmation Rate |\n`;
      txtContent += `|-------|--------------|--------------------|-------------------|\n`;
      filteredData.forEach((d) => {
        const rate = d.totalBookings > 0 ? ((d.confirmedBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%';
        txtContent += `| ${d.name.padEnd(5)} | ${String(d.totalBookings || 0).padEnd(12)} | ${String(d.confirmedBookings || 0).padEnd(18)} | ${rate.padEnd(17)} |\n`;
      });
    } else if (selectedReportId === 'all-vs-cancelled') {
      txtContent += `| Month | All Bookings | Cancelled Bookings | Cancellation Rate |\n`;
      txtContent += `|-------|--------------|--------------------|-------------------|\n`;
      filteredData.forEach((d) => {
        const rate = d.totalBookings > 0 ? ((d.cancelledBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%';
        txtContent += `| ${d.name.padEnd(5)} | ${String(d.totalBookings || 0).padEnd(12)} | ${String(d.cancelledBookings || 0).padEnd(18)} | ${rate.padEnd(17)} |\n`;
      });
    } else {
      txtContent += `| Month | Total Demand | Completed | Confirmed | Cancelled | Success Rate |\n`;
      txtContent += `|-------|--------------|-----------|-----------|-----------|--------------|\n`;
      filteredData.forEach((d) => {
        const rate = d.totalBookings > 0 ? ((d.completedBookings / d.totalBookings) * 100).toFixed(1) + '%' : '0.0%';
        txtContent += `| ${d.name.padEnd(5)} | ${String(d.totalBookings || 0).padEnd(12)} | ${String(d.completedBookings || 0).padEnd(9)} | ${String(d.confirmedBookings || 0).padEnd(9)} | ${String(d.cancelledBookings || 0).padEnd(9)} | ${rate.padEnd(12)} |\n`;
      });
    }

    txtContent += `========================================================================\n`;
    txtContent += `End of Report - Generated automatically by WorkWave Admin System.\n`;

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReportId}_report_${startDate}_to_${endDate}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-page animate-fade-in">
      {/* Header Banner */}
      <div className="reports-header-card">
        <div className="reports-header-info">
          <div className="reports-badge">
            <FiFileText /> System Report Generator
          </div>
          <h1>System & Performance Reports</h1>
          <p>
            Generate, filter by customizable time periods, and export executive analytical reports for user acquisition, booking volume, and service fulfillment metrics.
          </p>
        </div>

        {/* Global Export Buttons Header */}
        <div className="reports-export-actions">
          <button className="export-action-btn pdf" onClick={handleExportPDF} title="Download PDF Document">
            <FiDownload /> Export PDF
          </button>
          <button className="export-action-btn word" onClick={handleExportWord} title="Download Microsoft Word Document">
            <FiDownload /> Export Word (.doc)
          </button>
          <button className="export-action-btn txt" onClick={handleExportTXT} title="Download Plain Text Summary">
            <FiDownload /> Export TXT
          </button>
        </div>
      </div>

      {/* Report Selection Grid */}
      <div className="report-types-grid">
        {REPORT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedReportId === type.id;
          return (
            <div
              key={type.id}
              className={`report-type-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedReportId(type.id)}
            >
              <div className="report-card-top">
                <div 
                  className="report-type-icon-wrap" 
                  style={{ background: isSelected ? type.themeColor : '#f1f5f9', color: isSelected ? '#ffffff' : type.themeColor }}
                >
                  <Icon />
                </div>
                <span className="report-category-tag">{type.category}</span>
              </div>
              <h4 className="report-type-title">{type.title}</h4>
              <p className="report-type-desc">{type.description}</p>
            </div>
          );
        })}
      </div>

      {/* Time Period Filter Bar */}
      <div className="reports-filter-bar">
        <div className="filter-bar-left">
          <span className="filter-label-title">
            <FiCalendar /> Time Period Presets:
          </span>
          <div className="preset-buttons-group">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                className={`preset-btn ${activePreset === preset.label ? 'active' : ''}`}
                onClick={() => handlePresetSelect(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-bar-right">
          <div className="date-input-wrap">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset('Custom');
              }}
            />
          </div>
          <div className="date-input-wrap">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset('Custom');
              }}
            />
          </div>
          <button className="apply-filter-btn" onClick={fetchReportData} disabled={loading}>
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> {loading ? 'Updating...' : 'Apply'}
          </button>
        </div>
      </div>

      {/* Generated Report Main Preview */}
      <div className="report-preview-container">
        <div className="preview-meta-bar">
          <div className="preview-meta-left">
            <h3>{currentReport.title}</h3>
            <span className="preview-period-badge">
              Period: {startDate} — {endDate} ({activePreset})
            </span>
          </div>
          <div className="preview-meta-right">
            <span className="last-sync-tag">
              Last Generated: {lastGeneratedAt.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* 4 Executive KPI Metric Cards */}
        <div className="executive-kpi-grid">
          <div className="kpi-card" style={{ borderTopColor: summaryMetrics.metric1.color }}>
            <span className="kpi-label">{summaryMetrics.metric1.label}</span>
            <span className="kpi-value" style={{ color: summaryMetrics.metric1.color }}>
              {summaryMetrics.metric1.value}
            </span>
          </div>
          <div className="kpi-card" style={{ borderTopColor: summaryMetrics.metric2.color }}>
            <span className="kpi-label">{summaryMetrics.metric2.label}</span>
            <span className="kpi-value" style={{ color: summaryMetrics.metric2.color }}>
              {summaryMetrics.metric2.value}
            </span>
          </div>
          <div className="kpi-card" style={{ borderTopColor: summaryMetrics.metric3.color }}>
            <span className="kpi-label">{summaryMetrics.metric3.label}</span>
            <span className="kpi-value" style={{ color: summaryMetrics.metric3.color }}>
              {summaryMetrics.metric3.value}
            </span>
          </div>
          <div className="kpi-card" style={{ borderTopColor: summaryMetrics.metric4.color }}>
            <span className="kpi-label">{summaryMetrics.metric4.label}</span>
            <span className="kpi-value" style={{ color: summaryMetrics.metric4.color }}>
              {summaryMetrics.metric4.value}
            </span>
          </div>
        </div>

        {/* Visual Chart Preview */}
        <div className="report-chart-section">
          <div className="chart-section-header">
            <h4><FiBarChart2 /> Visual Analytical Trend ({startDate} to {endDate})</h4>
          </div>
          <div className="report-chart-wrap">
            <ResponsiveContainer width="100%" height={340}>
              {selectedReportId === 'user-growth' ? (
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="seekers" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} name="Seekers Base" />
                  <Line type="monotone" dataKey="providers" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} name="Providers Base" />
                  <Line type="monotone" dataKey="totalUsers" stroke="#4f46e5" strokeWidth={3} dot={{ r: 5 }} name="Total Users" />
                </LineChart>
              ) : selectedReportId === 'all-vs-completed' ? (
                <BarChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="totalBookings" fill="#4f46e5" radius={[6, 6, 0, 0]} name="All Bookings (Demand)" />
                  <Bar dataKey="completedBookings" fill="#059669" radius={[6, 6, 0, 0]} name="Completed Bookings" />
                </BarChart>
              ) : selectedReportId === 'all-vs-confirmed' ? (
                <BarChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="totalBookings" fill="#4f46e5" radius={[6, 6, 0, 0]} name="All Bookings (Demand)" />
                  <Bar dataKey="confirmedBookings" fill="#2563eb" radius={[6, 6, 0, 0]} name="Confirmed Bookings" />
                </BarChart>
              ) : selectedReportId === 'all-vs-cancelled' ? (
                <BarChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="totalBookings" fill="#4f46e5" radius={[6, 6, 0, 0]} name="All Bookings (Demand)" />
                  <Bar dataKey="cancelledBookings" fill="#e11d48" radius={[6, 6, 0, 0]} name="Cancelled Bookings" />
                </BarChart>
              ) : (
                <BarChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="totalBookings" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Total Demand" />
                  <Bar dataKey="completedBookings" fill="#059669" radius={[4, 4, 0, 0]} name="Completed" />
                  <Bar dataKey="confirmedBookings" fill="#2563eb" radius={[4, 4, 0, 0]} name="Confirmed" />
                  <Bar dataKey="cancelledBookings" fill="#e11d48" radius={[4, 4, 0, 0]} name="Cancelled" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Breakdown Data Table */}
        <div className="report-table-section">
          <div className="table-section-header">
            <h4><FiLayers /> Monthly Breakdown Data Summary</h4>
          </div>
          <div className="table-responsive">
            <table className="report-data-table">
              <thead>
                {selectedReportId === 'user-growth' ? (
                  <tr>
                    <th>MONTH</th>
                    <th>NEW SEEKERS</th>
                    <th>NEW PROVIDERS</th>
                    <th>TOTAL ACTIVE BASE</th>
                  </tr>
                ) : selectedReportId === 'all-vs-completed' ? (
                  <tr>
                    <th>MONTH</th>
                    <th>ALL BOOKINGS (DEMAND)</th>
                    <th>COMPLETED BOOKINGS</th>
                    <th>COMPLETION SUCCESS RATE</th>
                  </tr>
                ) : selectedReportId === 'all-vs-confirmed' ? (
                  <tr>
                    <th>MONTH</th>
                    <th>ALL BOOKINGS (DEMAND)</th>
                    <th>CONFIRMED BOOKINGS</th>
                    <th>CONFIRMATION RATE</th>
                  </tr>
                ) : selectedReportId === 'all-vs-cancelled' ? (
                  <tr>
                    <th>MONTH</th>
                    <th>ALL BOOKINGS (DEMAND)</th>
                    <th>CANCELLED BOOKINGS</th>
                    <th>CANCELLATION RATE</th>
                  </tr>
                ) : (
                  <tr>
                    <th>MONTH</th>
                    <th>TOTAL DEMAND</th>
                    <th>COMPLETED</th>
                    <th>CONFIRMED</th>
                    <th>CANCELLED</th>
                    <th>SUCCESS RATE</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredData.map((row) => {
                  const rate = row.totalBookings > 0 ? ((row.completedBookings / row.totalBookings) * 100).toFixed(1) + '%' : '0.0%';
                  const confRate = row.totalBookings > 0 ? ((row.confirmedBookings / row.totalBookings) * 100).toFixed(1) + '%' : '0.0%';
                  const cancRate = row.totalBookings > 0 ? ((row.cancelledBookings / row.totalBookings) * 100).toFixed(1) + '%' : '0.0%';

                  if (selectedReportId === 'user-growth') {
                    return (
                      <tr key={row.name}>
                        <td className="font-bold">{row.name}</td>
                        <td>{row.newSeekers || 0}</td>
                        <td>{row.newProviders || 0}</td>
                        <td className="font-bold text-indigo">{row.totalUsers || 0}</td>
                      </tr>
                    );
                  } else if (selectedReportId === 'all-vs-completed') {
                    return (
                      <tr key={row.name}>
                        <td className="font-bold">{row.name}</td>
                        <td className="font-bold text-indigo">{row.totalBookings || 0}</td>
                        <td className="font-bold text-emerald">{row.completedBookings || 0}</td>
                        <td>
                          <span className="rate-badge success">{rate}</span>
                        </td>
                      </tr>
                    );
                  } else if (selectedReportId === 'all-vs-confirmed') {
                    return (
                      <tr key={row.name}>
                        <td className="font-bold">{row.name}</td>
                        <td className="font-bold text-indigo">{row.totalBookings || 0}</td>
                        <td className="font-bold text-blue">{row.confirmedBookings || 0}</td>
                        <td>
                          <span className="rate-badge blue">{confRate}</span>
                        </td>
                      </tr>
                    );
                  } else if (selectedReportId === 'all-vs-cancelled') {
                    return (
                      <tr key={row.name}>
                        <td className="font-bold">{row.name}</td>
                        <td className="font-bold text-indigo">{row.totalBookings || 0}</td>
                        <td className="font-bold text-rose">{row.cancelledBookings || 0}</td>
                        <td>
                          <span className="rate-badge rose">{cancRate}</span>
                        </td>
                      </tr>
                    );
                  } else {
                    return (
                      <tr key={row.name}>
                        <td className="font-bold">{row.name}</td>
                        <td className="font-bold text-indigo">{row.totalBookings || 0}</td>
                        <td className="font-bold text-emerald">{row.completedBookings || 0}</td>
                        <td className="text-blue">{row.confirmedBookings || 0}</td>
                        <td className="text-rose">{row.cancelledBookings || 0}</td>
                        <td>
                          <span className="rate-badge success">{rate}</span>
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
