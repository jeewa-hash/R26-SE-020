import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FiDollarSign, FiSearch, FiFilter, FiRefreshCw, FiDownload,
  FiCheckCircle, FiClock, FiAlertTriangle, FiLock, FiExternalLink,
  FiSend, FiCheck, FiX, FiLayers, FiActivity, FiUser, FiMapPin,
  FiCalendar, FiArrowUpRight, FiFileText
} from 'react-icons/fi';
import { ADMIN_SERVICE_URL } from '../config';
import './MonthlyPaymentsPage.css';

const DISTRICT_OPTIONS = [
  'All Districts',
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

const MonthlyPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    totalInvoiced: 0,
    totalCollected: 0,
    totalPending: 0,
    totalGrossVolume: 0,
    complianceRate: '100.0',
    totalBillsCount: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    suspendedCount: 0,
  });
  const [availableMonths, setAvailableMonths] = useState(['2026-08', '2026-07']);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Modal & Alerts
  const [selectedBill, setSelectedBill] = useState(null);
  const [confirmPaymentBill, setConfirmPaymentBill] = useState(null);
  const [confirmReminderBill, setConfirmReminderBill] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  // Fetch payments from API
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_SERVICE_URL}/api/monthly-commission-payments`, {
        params: {
          month: selectedMonth,
          status: selectedStatus,
          district: selectedDistrict,
          search: searchQuery,
        },
      });

      if (res.data && res.data.success) {
        setPayments(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (res.data.availableMonths && res.data.availableMonths.length > 0) {
          setAvailableMonths(res.data.availableMonths);
        }
      }
    } catch (err) {
      console.error('Failed to fetch monthly payments:', err);
      showAlert('Failed to load monthly payments data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedStatus, selectedDistrict, searchQuery]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const showAlert = (message, type = 'success') => {
    setAlertMessage({ message, type });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4000);
  };

  // Send Reminder Execution (triggered after modal confirmation)
  const executeSendReminder = async (billId, providerName, amount) => {
    setActionLoadingId(billId);
    try {
      const res = await axios.post(`${ADMIN_SERVICE_URL}/api/monthly-commission-payments/${billId}/remind`);
      if (res.data && res.data.success) {
        showAlert(res.data.message || `Payment reminder successfully sent to ${providerName} (Rs. ${amount.toLocaleString()} LKR).`, 'success');
      } else {
        showAlert(res.data.message || 'Could not send reminder', 'error');
      }
    } catch (err) {
      showAlert('Failed to dispatch payment reminder', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mark as Paid Execution (triggered after modal confirmation)
  const executeMarkPaid = async (billId, providerName) => {
    setActionLoadingId(billId);
    try {
      const res = await axios.patch(`${ADMIN_SERVICE_URL}/api/monthly-commission-payments/${billId}/mark-paid`, {
        paymentNote: 'Manual settlement confirmed by Administrator',
        transactionReference: `ADMIN_MANUAL_${Date.now()}`,
      });
      if (res.data && res.data.success) {
        showAlert(`Commission for ${providerName} successfully marked as PAID!`, 'success');
        fetchPayments();
        if (selectedBill && selectedBill._id === billId) {
          setSelectedBill(prev => prev ? { ...prev, status: 'PAID' } : null);
        }
      }
    } catch (err) {
      showAlert('Failed to update bill payment status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (payments.length === 0) {
      showAlert('No payment records to export', 'error');
      return;
    }

    const headers = [
      'Billing Month',
      'Provider Name',
      'Email',
      'Phone',
      'District',
      'Category',
      'Completed Bookings',
      'Provider Gross GMV (LKR)',
      '5% Commission (LKR)',
      'Payment Due Date',
      'Payment Status',
      'Paid Date',
      'Stripe Reference',
    ];

    const rows = payments.map(p => [
      `"${p.billingMonth}"`,
      `"${p.provider.fullName}"`,
      `"${p.provider.email}"`,
      `"${p.provider.phone}"`,
      `"${p.provider.district}"`,
      `"${p.provider.category}"`,
      p.completedBookingsCount,
      p.totalIncome,
      p.serviceChargeAmount,
      p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'N/A',
      p.status,
      p.paymentDetails?.paidAt ? new Date(p.paymentDetails.paidAt).toLocaleDateString() : 'N/A',
      `"${p.paymentDetails?.stripeSessionId || 'N/A'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monthly_commission_payments_${selectedMonth}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showAlert('CSV Report downloaded successfully!', 'success');
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (payments.length === 0) {
      showAlert('No payment records to export', 'error');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const nowStr = new Date().toLocaleString();

    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('WORKWAVE - PROVIDER MONTHLY COMMISSION PAYMENTS REPORT', 14, 14);

    // Meta Info
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated By: ${adminUser.fullName || 'Admin'} | Date: ${nowStr} | Month: ${selectedMonth} | District: ${selectedDistrict}`, 14, 30);

    // Summary Box
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(14, 34, 269, 16, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Invoiced: Rs. ${summary.totalInvoiced.toLocaleString()} LKR  |  Collected: Rs. ${summary.totalCollected.toLocaleString()} LKR  |  Pending: Rs. ${summary.totalPending.toLocaleString()} LKR  |  Compliance: ${summary.complianceRate}%  |  Total Gross GMV: Rs. ${summary.totalGrossVolume.toLocaleString()} LKR`, 18, 44);

    const tableHeaders = ['Month', 'Provider Name', 'District', 'Category', 'Jobs', 'Gross GMV (LKR)', '5% Commission (LKR)', 'Due Date', 'Status', 'Settled Date'];
    const tableRows = payments.map(p => [
      p.billingMonth,
      p.provider.fullName,
      p.provider.district,
      p.provider.category,
      p.completedBookingsCount,
      `Rs. ${p.totalIncome.toLocaleString()}`,
      `Rs. ${p.serviceChargeAmount.toLocaleString()}`,
      p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'N/A',
      p.status,
      p.paymentDetails?.paidAt ? new Date(p.paymentDetails.paidAt).toLocaleDateString() : '-',
    ]);

    autoTable(doc, {
      startY: 54,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`monthly_commission_payments_${selectedMonth}_${Date.now()}.pdf`);
    showAlert('PDF Statement downloaded successfully!', 'success');
  };

  const getInitials = (name) => {
    if (!name) return 'SP';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="monthly-payments-page animate-fade-in">
      {/* Alert Banner */}
      {alertMessage && (
        <div className={`mp-alert-banner ${alertMessage.type}`}>
          {alertMessage.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
          <span>{alertMessage.message}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="mp-hero-header">
        <div className="mp-hero-left">
          <div className="mp-header-icon-box">
            <FiDollarSign />
          </div>
          <div>
            <div className="mp-title-row">
              <h1>Provider Monthly Commission Payments</h1>
              <span className="mp-live-badge">
                <span className="mp-live-pulse"></span> 5% Platform Fee Engine
              </span>
            </div>
            <p>
              Monitor month-end 5% platform service charges on completed jobs, track provider payment compliance, and review financial settlements.
            </p>
          </div>
        </div>

        <div className="mp-header-actions">
          <button className="mp-action-btn refresh" onClick={fetchPayments} disabled={loading} title="Refresh Table">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="mp-action-btn csv" onClick={handleExportCSV} title="Export CSV Spreadsheet">
            <FiDownload /> Export CSV
          </button>
          <button className="mp-action-btn pdf" onClick={handleExportPDF} title="Export PDF Statement">
            <FiFileText /> Export PDF
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards Grid */}
      <div className="mp-kpi-grid">
        {/* Card 1: Total Invoiced */}
        <div className="mp-kpi-card invoiced">
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">Total Commission Invoiced</span>
            <div className="mp-kpi-icon invoiced"><FiDollarSign /></div>
          </div>
          <div className="mp-kpi-value-row">
            <span className="mp-currency">Rs.</span>
            <span className="mp-amount">{summary.totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="mp-code">LKR</span>
          </div>
          <div className="mp-kpi-footer">
            <span className="mp-kpi-tag invoiced">5% Direct Fee</span>
            <span className="mp-kpi-meta">{summary.totalBillsCount} Invoices Generated</span>
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div className="mp-kpi-card collected">
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">Total Collected / Settled</span>
            <div className="mp-kpi-icon collected"><FiCheckCircle /></div>
          </div>
          <div className="mp-kpi-value-row">
            <span className="mp-currency">Rs.</span>
            <span className="mp-amount text-emerald">{summary.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="mp-code">LKR</span>
          </div>
          <div className="mp-kpi-footer">
            <span className="mp-kpi-tag collected">
              <FiCheck /> {summary.complianceRate}% Compliance
            </span>
            <span className="mp-kpi-meta">{summary.paidCount} Providers Paid</span>
          </div>
        </div>

        {/* Card 3: Total Pending / Overdue */}
        <div className="mp-kpi-card pending">
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">Outstanding / Pending Balance</span>
            <div className="mp-kpi-icon pending"><FiClock /></div>
          </div>
          <div className="mp-kpi-value-row">
            <span className="mp-currency">Rs.</span>
            <span className="mp-amount text-amber">{summary.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="mp-code">LKR</span>
          </div>
          <div className="mp-kpi-footer">
            <span className="mp-kpi-tag pending">{summary.pendingCount} Pending • {summary.overdueCount} Overdue</span>
            <span className="mp-kpi-meta">Grace: 3 Days</span>
          </div>
        </div>

        {/* Card 4: Gross GMV Turnover */}
        <div className="mp-kpi-card gmv">
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">Marketplace Gross GMV</span>
            <div className="mp-kpi-icon gmv"><FiActivity /></div>
          </div>
          <div className="mp-kpi-value-row">
            <span className="mp-currency">Rs.</span>
            <span className="mp-amount">{summary.totalGrossVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="mp-code">LKR</span>
          </div>
          <div className="mp-kpi-footer">
            <span className="mp-kpi-tag gmv">100% Volume</span>
            <span className="mp-kpi-meta">Provider Gross Earnings</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar Section */}
      <div className="mp-filter-toolbar">
        {/* Left: Status Segmented Tabs */}
        <div className="mp-status-tabs">
          <button
            className={`mp-status-tab ${selectedStatus === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('ALL')}
          >
            All Bills <span className="mp-tab-count">{summary.totalBillsCount}</span>
          </button>
          <button
            className={`mp-status-tab paid ${selectedStatus === 'PAID' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('PAID')}
          >
            <FiCheckCircle /> Paid <span className="mp-tab-count">{summary.paidCount}</span>
          </button>
          <button
            className={`mp-status-tab pending ${selectedStatus === 'PENDING' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('PENDING')}
          >
            <FiClock /> Pending <span className="mp-tab-count">{summary.pendingCount}</span>
          </button>
          <button
            className={`mp-status-tab overdue ${selectedStatus === 'OVERDUE' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('OVERDUE')}
          >
            <FiAlertTriangle /> Overdue <span className="mp-tab-count">{summary.overdueCount}</span>
          </button>
        </div>

        {/* Right: Dropdowns & Search */}
        <div className="mp-filter-controls">
          {/* Month Selector */}
          <div className="mp-select-wrap">
            <FiCalendar className="mp-select-icon" />
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="ALL">All Billing Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m} ({new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })})
                </option>
              ))}
            </select>
          </div>

          {/* District Selector */}
          <div className="mp-select-wrap">
            <FiMapPin className="mp-select-icon" />
            <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
              {DISTRICT_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="mp-search-wrap">
            <FiSearch className="mp-search-icon" />
            <input
              type="text"
              placeholder="Search provider name, category, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="mp-clear-search" onClick={() => setSearchQuery('')}>
                <FiX />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Detailed Data Table */}
      <div className="mp-table-card">
        <div className="mp-table-header">
          <div className="mp-table-title-row">
            <FiLayers />
            <h3>Provider Monthly Commission Ledger</h3>
            <span className="mp-results-pill">{payments.length} Records Found</span>
          </div>
        </div>

        <div className="mp-table-responsive">
          <table className="mp-data-table">
            <thead>
              <tr>
                <th>SERVICE PROVIDER</th>
                <th>BILLING MONTH</th>
                <th>COMPLETED JOBS</th>
                <th>GROSS EARNINGS (GMV)</th>
                <th>5% COMMISSION</th>
                <th>PAYMENT DUE DATE</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="mp-loading-state">
                    <FiRefreshCw className="animate-spin" /> Loading live monthly commission records...
                  </td>
                </tr>
              ) : payments.length > 0 ? (
                payments.map((bill) => (
                  <tr key={bill._id} className={bill.status.toLowerCase()}>
                    {/* Provider Info */}
                    <td>
                      <div className="mp-provider-cell">
                        <div className="mp-provider-avatar">
                          {bill.provider.avatar ? (
                            <img src={bill.provider.avatar} alt={bill.provider.fullName} />
                          ) : (
                            <span>{getInitials(bill.provider.fullName)}</span>
                          )}
                        </div>
                        <div className="mp-provider-info">
                          <strong className="mp-provider-name">{bill.provider.fullName}</strong>
                          <div className="mp-provider-tags">
                            <span className="mp-district-tag"><FiMapPin /> {bill.provider.district || 'Colombo'}</span>
                            <span className="mp-category-tag">{bill.provider.category || 'General Service'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Billing Month */}
                    <td>
                      <span className="mp-month-badge">
                        <FiCalendar /> {bill.billingMonth}
                      </span>
                    </td>

                    {/* Completed Bookings */}
                    <td>
                      <span className="mp-jobs-badge">
                        {bill.completedBookingsCount} Completed
                      </span>
                    </td>

                    {/* Gross Income (100%) */}
                    <td>
                      <span className="mp-gmv-amount">
                        Rs. {Number(bill.totalIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LKR
                      </span>
                    </td>

                    {/* 5% Commission Due */}
                    <td>
                      <strong className="mp-commission-amount">
                        Rs. {Number(bill.serviceChargeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LKR
                      </strong>
                    </td>

                    {/* Due Date & Relative Days */}
                    <td>
                      <div className="mp-due-date-cell">
                        <span>{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                        <small className={`mp-days-tag ${bill.status.toLowerCase()}`}>{bill.daysDiffText}</small>
                      </div>
                    </td>

                    {/* Payment Status */}
                    <td>
                      <span className={`mp-status-pill ${bill.status.toLowerCase()}`}>
                        {bill.status === 'PAID' && <><FiCheckCircle /> PAID</>}
                        {bill.status === 'PENDING' && <><FiClock /> PENDING</>}
                        {bill.status === 'OVERDUE' && <><FiAlertTriangle /> OVERDUE</>}
                        {bill.status === 'SUSPENDED' && <><FiLock /> SUSPENDED</>}
                        {bill.status === 'WAIVED' && <>WAIVED</>}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="mp-actions-cell">
                        {/* Statement / Receipt Button */}
                        <button
                          className="mp-action-icon-btn view"
                          title="View Statement & Receipt Details"
                          onClick={() => setSelectedBill(bill)}
                        >
                          <FiExternalLink />
                        </button>

                        {/* Send Reminder (if Pending or Overdue) */}
                        {bill.status !== 'PAID' && (
                          <button
                            className="mp-action-icon-btn remind"
                            title="Send Payment Reminder"
                            disabled={actionLoadingId === bill._id}
                            onClick={() => setConfirmReminderBill(bill)}
                          >
                            <FiSend />
                          </button>
                        )}

                        {/* Mark as Paid Button (Explicit readable button) */}
                        {bill.status !== 'PAID' ? (
                          <button
                            className="mp-btn-mark-paid"
                            title="Mark as Paid (Manual Settlement)"
                            disabled={actionLoadingId === bill._id}
                            onClick={() => setConfirmPaymentBill(bill)}
                          >
                            <FiCheckCircle /> Mark as Paid
                          </button>
                        ) : (
                          <span className="mp-settled-label">
                            <FiCheckCircle /> Settled
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="mp-empty-state">
                    <FiLayers />
                    <h4>No Commission Billing Records Found</h4>
                    <p>Try adjusting your search query, billing month, or payment status filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Statement & Receipt Detail Modal */}
      {selectedBill && (
        <div className="mp-modal-overlay" onClick={() => setSelectedBill(null)}>
          <div className="mp-modal-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <div className="mp-modal-title">
                <FiDollarSign />
                <div>
                  <h3>Monthly Commission Statement</h3>
                  <p>Billing Reference #{selectedBill._id}</p>
                </div>
              </div>
              <button className="mp-modal-close" onClick={() => setSelectedBill(null)}>
                <FiX />
              </button>
            </div>

            <div className="mp-modal-body">
              {/* Provider Profile Summary */}
              <div className="mp-modal-provider-box">
                <div className="mp-modal-avatar">
                  {selectedBill.provider.avatar ? (
                    <img src={selectedBill.provider.avatar} alt={selectedBill.provider.fullName} />
                  ) : (
                    <span>{getInitials(selectedBill.provider.fullName)}</span>
                  )}
                </div>
                <div className="mp-modal-provider-info">
                  <h4>{selectedBill.provider.fullName}</h4>
                  <p>{selectedBill.provider.email} • {selectedBill.provider.phone}</p>
                  <div className="mp-modal-provider-badges">
                    <span className="mp-badge"><FiMapPin /> {selectedBill.provider.district}</span>
                    <span className="mp-badge">{selectedBill.provider.category}</span>
                  </div>
                </div>
                <div className="mp-modal-status-badge">
                  <span className={`mp-status-pill ${selectedBill.status.toLowerCase()}`}>
                    {selectedBill.status}
                  </span>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="mp-modal-finance-grid">
                <div className="mp-finance-item">
                  <span className="mp-f-label">Billing Cycle Month</span>
                  <strong className="mp-f-val">{selectedBill.billingMonth}</strong>
                </div>
                <div className="mp-finance-item">
                  <span className="mp-f-label">Completed Bookings</span>
                  <strong className="mp-f-val">{selectedBill.completedBookingsCount} Jobs</strong>
                </div>
                <div className="mp-finance-item">
                  <span className="mp-f-label">Gross Provider Earnings</span>
                  <strong className="mp-f-val">Rs. {Number(selectedBill.totalIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} LKR</strong>
                </div>
                <div className="mp-finance-item highlight">
                  <span className="mp-f-label">5% Platform Commission</span>
                  <strong className="mp-f-val text-emerald">Rs. {Number(selectedBill.serviceChargeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} LKR</strong>
                </div>
              </div>

              {/* Settlement / Stripe Transaction Details */}
              <div className="mp-modal-settlement-box">
                <h5><FiCheckCircle /> Payment & Settlement Information</h5>
                <div className="mp-settlement-rows">
                  <div className="mp-s-row">
                    <span>Payment Due Date:</span>
                    <strong>{selectedBill.dueDate ? new Date(selectedBill.dueDate).toLocaleString() : 'N/A'}</strong>
                  </div>
                  <div className="mp-s-row">
                    <span>Amount Settled:</span>
                    <strong>Rs. {Number(selectedBill.paymentDetails?.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} LKR</strong>
                  </div>
                  <div className="mp-s-row">
                    <span>Settled Timestamp:</span>
                    <strong>{selectedBill.paymentDetails?.paidAt ? new Date(selectedBill.paymentDetails.paidAt).toLocaleString() : 'Pending Settlement'}</strong>
                  </div>
                  <div className="mp-s-row">
                    <span>Stripe Session / Reference ID:</span>
                    <code className="mp-ref-code">{selectedBill.paymentDetails?.stripeSessionId || 'N/A'}</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="mp-modal-footer">
              {selectedBill.status !== 'PAID' && (
                <button
                  className="mp-modal-btn remind"
                  disabled={actionLoadingId === selectedBill._id}
                  onClick={() => setConfirmReminderBill(selectedBill)}
                >
                  <FiSend /> Send Payment Reminder
                </button>
              )}
              {selectedBill.status !== 'PAID' && (
                <button
                  className="mp-modal-btn mark-paid"
                  disabled={actionLoadingId === selectedBill._id}
                  onClick={() => {
                    setConfirmPaymentBill(selectedBill);
                  }}
                >
                  <FiCheckCircle /> Mark as Settled (Paid)
                </button>
              )}
              <button className="mp-modal-btn close" onClick={() => setSelectedBill(null)}>
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Custom Elegant Confirmation Modal for Mark as Paid */}
      {confirmPaymentBill && (
        <div className="mp-modal-overlay" onClick={() => setConfirmPaymentBill(null)}>
          <div className="mp-modal-card mp-confirm-modal animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="mp-confirm-header">
              <div className="mp-confirm-icon-box">
                <FiCheckCircle />
              </div>
              <button className="mp-modal-close" onClick={() => setConfirmPaymentBill(null)}>
                <FiX />
              </button>
            </div>

            <div className="mp-confirm-body">
              <h3>Confirm Commission Settlement</h3>
              <p className="mp-confirm-sub">
                Are you sure you want to mark the 5% platform service charge for this provider as <strong>PAID</strong>?
              </p>

              <div className="mp-confirm-info-box">
                <div className="mp-confirm-row">
                  <span>Service Provider:</span>
                  <strong>{confirmPaymentBill.provider.fullName}</strong>
                </div>
                <div className="mp-confirm-row">
                  <span>District:</span>
                  <span>{confirmPaymentBill.provider.district}</span>
                </div>
                <div className="mp-confirm-row">
                  <span>Billing Month:</span>
                  <strong>{confirmPaymentBill.billingMonth}</strong>
                </div>
                <div className="mp-confirm-row highlight">
                  <span>5% Commission Due:</span>
                  <strong className="text-emerald">Rs. {Number(confirmPaymentBill.serviceChargeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LKR</strong>
                </div>
              </div>

              <div className="mp-confirm-note-box">
                <span>💡</span>
                <p>This will record an administrative settlement entry, clear the pending invoice, and maintain the provider's active standing.</p>
              </div>
            </div>

            <div className="mp-confirm-footer">
              <button 
                className="mp-btn-cancel"
                onClick={() => setConfirmPaymentBill(null)}
              >
                Cancel
              </button>
              <button
                className="mp-btn-confirm-paid"
                disabled={actionLoadingId === confirmPaymentBill._id}
                onClick={async () => {
                  await executeMarkPaid(confirmPaymentBill._id, confirmPaymentBill.provider.fullName);
                  setConfirmPaymentBill(null);
                }}
              >
                <FiCheckCircle /> {actionLoadingId === confirmPaymentBill._id ? 'Processing...' : 'Confirm & Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Custom Elegant Confirmation Modal for Send Payment Reminder */}
      {confirmReminderBill && (
        <div className="mp-modal-overlay" onClick={() => setConfirmReminderBill(null)}>
          <div className="mp-modal-card mp-confirm-modal animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="mp-confirm-header">
              <div className="mp-confirm-icon-box remind-theme">
                <FiSend />
              </div>
              <button className="mp-modal-close" onClick={() => setConfirmReminderBill(null)}>
                <FiX />
              </button>
            </div>

            <div className="mp-confirm-body">
              <h3>Send Payment Reminder</h3>
              <p className="mp-confirm-sub">
                Are you sure you want to dispatch a 5% commission payment reminder to this provider?
              </p>

              <div className="mp-confirm-info-box">
                <div className="mp-confirm-row">
                  <span>Service Provider:</span>
                  <strong>{confirmReminderBill.provider.fullName}</strong>
                </div>
                <div className="mp-confirm-row">
                  <span>Email:</span>
                  <span>{confirmReminderBill.provider.email}</span>
                </div>
                <div className="mp-confirm-row">
                  <span>Billing Month:</span>
                  <strong>{confirmReminderBill.billingMonth}</strong>
                </div>
                <div className="mp-confirm-row highlight">
                  <span>5% Commission Due:</span>
                  <strong className="text-amber">Rs. {Number(confirmReminderBill.serviceChargeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LKR</strong>
                </div>
              </div>

              <div className="mp-confirm-note-box remind-note">
                <span>📩</span>
                <p>An official WorkWave email invoice and an in-app mobile notification will be sent immediately.</p>
              </div>
            </div>

            <div className="mp-confirm-footer">
              <button 
                className="mp-btn-cancel"
                onClick={() => setConfirmReminderBill(null)}
              >
                Cancel
              </button>
              <button
                className="mp-btn-confirm-remind"
                disabled={actionLoadingId === confirmReminderBill._id}
                onClick={async () => {
                  await executeSendReminder(confirmReminderBill._id, confirmReminderBill.provider.fullName, confirmReminderBill.serviceChargeAmount);
                  setConfirmReminderBill(null);
                }}
              >
                <FiSend /> {actionLoadingId === confirmReminderBill._id ? 'Sending...' : 'Confirm & Send Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyPaymentsPage;
