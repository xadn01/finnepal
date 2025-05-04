import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateExcel } from '../utils/excelGenerator';
import XLSX from 'xlsx';

interface LedgerEntry {
  id: string;
  date: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
  tenantId: string;
  createdAt: Date;
}

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  entries: {
    account: string;
    debit: number;
    credit: number;
  }[];
  tenantId: string;
  createdAt: Date;
}

const Accounting = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'ledger' | 'journal' | 'reports'>('ledger');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    account: '',
    description: '',
    debit: 0,
    credit: 0
  });
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const fetchLedgerEntries = async () => {
    if (!user || !user.tenantId) return;

    try {
      const q = query(collection(db, 'ledgerEntries'), where('tenantId', '==', user.tenantId));
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LedgerEntry[];
      setLedgerEntries(entries);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
    }
  };

  const fetchJournalEntries = async () => {
    if (!user || !user.tenantId) return;

    try {
      const q = query(collection(db, 'journalEntries'), where('tenantId', '==', user.tenantId));
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JournalEntry[];
      setJournalEntries(entries);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    }
  };

  useEffect(() => {
    fetchLedgerEntries();
    fetchJournalEntries();
    setLoading(false);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.tenantId) return;

    try {
      const docRef = await addDoc(collection(db, 'ledgerEntries'), {
        ...formData,
        tenantId: user.tenantId,
        createdAt: new Date()
      });

      const newEntry: LedgerEntry = {
        id: docRef.id,
        ...formData,
        tenantId: user.tenantId,
        createdAt: new Date()
      };

      setLedgerEntries([...ledgerEntries, newEntry]);
      setFormData({
        date: '',
        account: '',
        description: '',
        debit: 0,
        credit: 0
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error creating ledger entry:', error);
    }
  };

  const handleExportLedgerExcel = () => {
    const filteredEntries = ledgerEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      return entryDate >= fromDate && entryDate <= toDate;
    });

    const exportData = filteredEntries.map(entry => ({
      [t('accounting.date')]: entry.date,
      [t('accounting.account')]: entry.account,
      [t('accounting.description')]: entry.description,
      [t('accounting.debit')]: entry.debit.toFixed(2),
      [t('accounting.credit')]: entry.credit.toFixed(2)
    }));

    generateExcel({
      filename: `ledger-entries-${dateRange.from}-to-${dateRange.to}`,
      sheetName: t('accounting.ledger'),
      data: exportData,
      headers: [
        t('accounting.date'),
        t('accounting.account'),
        t('accounting.description'),
        t('accounting.debit'),
        t('accounting.credit')
      ]
    });
  };

  const handleExportJournalExcel = () => {
    const filteredEntries = journalEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      return entryDate >= fromDate && entryDate <= toDate;
    });

    const exportData = filteredEntries.map(entry => ({
      [t('accounting.date')]: entry.date,
      [t('accounting.description')]: entry.description,
      [t('accounting.entries')]: entry.entries.map(e => 
        `${e.account}: ${e.debit.toFixed(2)} Dr / ${e.credit.toFixed(2)} Cr`
      ).join('\n')
    }));

    generateExcel({
      filename: `journal-entries-${dateRange.from}-to-${dateRange.to}`,
      sheetName: t('accounting.journal'),
      data: exportData,
      headers: [
        t('accounting.date'),
        t('accounting.description'),
        t('accounting.entries')
      ]
    });
  };

  const handleExportReportsExcel = () => {
    // Trial Balance data with detailed accounts
    const trialBalanceData = [
      {
        [t('accounting.account')]: t('accounting.assets'),
        [t('accounting.debit')]: '',
        [t('accounting.credit')]: ''
      },
      {
        [t('accounting.account')]: '  ' + t('accounting.cash'),
        [t('accounting.debit')]: '10000.00',
        [t('accounting.credit')]: '0.00'
      },
      {
        [t('accounting.account')]: '  ' + t('accounting.accountsReceivable'),
        [t('accounting.debit')]: '5000.00',
        [t('accounting.credit')]: '0.00'
      },
      {
        [t('accounting.account')]: '  ' + t('accounting.inventory'),
        [t('accounting.debit')]: '8000.00',
        [t('accounting.credit')]: '0.00'
      },
      {
        [t('accounting.account')]: t('accounting.liabilities'),
        [t('accounting.debit')]: '',
        [t('accounting.credit')]: ''
      },
      {
        [t('accounting.account')]: '  ' + t('accounting.accountsPayable'),
        [t('accounting.debit')]: '0.00',
        [t('accounting.credit')]: '3000.00'
      },
      {
        [t('accounting.account')]: '  ' + t('accounting.loans'),
        [t('accounting.debit')]: '0.00',
        [t('accounting.credit')]: '5000.00'
      },
      {
        [t('accounting.account')]: t('accounting.equity'),
        [t('accounting.debit')]: '',
        [t('accounting.credit')]: ''
      },
      {
        [t('accounting.account')]: '  ' + t('accounting.capital'),
        [t('accounting.debit')]: '0.00',
        [t('accounting.credit')]: '12000.00'
      },
      {
        [t('accounting.account')]: '  ' + t('accounting.retainedEarnings'),
        [t('accounting.debit')]: '0.00',
        [t('accounting.credit')]: '3000.00'
      }
    ];

    // Detailed Profit & Loss data
    const profitLossData = [
      {
        [t('accounting.description')]: t('accounting.revenue'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.sales'),
        [t('accounting.amount')]: '50000.00'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.otherIncome'),
        [t('accounting.amount')]: '2000.00'
      },
      {
        [t('accounting.description')]: t('accounting.expenses'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.costOfGoodsSold'),
        [t('accounting.amount')]: '25000.00'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.operatingExpenses'),
        [t('accounting.amount')]: '5000.00'
      },
      {
        [t('accounting.description')]: t('accounting.profit'),
        [t('accounting.amount')]: '20000.00'
      }
    ];

    // Detailed Balance Sheet data
    const balanceSheetData = [
      {
        [t('accounting.description')]: t('accounting.assets'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.currentAssets'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.cash'),
        [t('accounting.amount')]: '10000.00'
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.accountsReceivable'),
        [t('accounting.amount')]: '5000.00'
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.inventory'),
        [t('accounting.amount')]: '8000.00'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.fixedAssets'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.equipment'),
        [t('accounting.amount')]: '10000.00'
      },
      {
        [t('accounting.description')]: t('accounting.liabilities'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.currentLiabilities'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.accountsPayable'),
        [t('accounting.amount')]: '3000.00'
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.shortTermLoans'),
        [t('accounting.amount')]: '2000.00'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.longTermLiabilities'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.longTermLoans'),
        [t('accounting.amount')]: '3000.00'
      },
      {
        [t('accounting.description')]: t('accounting.equity'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.capital'),
        [t('accounting.amount')]: '12000.00'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.retainedEarnings'),
        [t('accounting.amount')]: '3000.00'
      }
    ];

    // Detailed Cash Flow data
    const cashFlowData = [
      {
        [t('accounting.description')]: t('accounting.operatingActivities'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.netIncome'),
        [t('accounting.amount')]: '20000.00'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.depreciation'),
        [t('accounting.amount')]: '1000.00'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.changesInWorkingCapital'),
        [t('accounting.amount')]: '-6000.00'
      },
      {
        [t('accounting.description')]: t('accounting.investingActivities'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.purchaseOfEquipment'),
        [t('accounting.amount')]: '-5000.00'
      },
      {
        [t('accounting.description')]: t('accounting.financingActivities'),
        [t('accounting.amount')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.loanProceeds'),
        [t('accounting.amount')]: '5000.00'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.loanRepayments'),
        [t('accounting.amount')]: '-3000.00'
      },
      {
        [t('accounting.description')]: t('accounting.netCashFlow'),
        [t('accounting.amount')]: '12000.00'
      }
    ];

    // Industry-specific ratios and benchmarks
    const industryBenchmarks = {
      retail: {
        currentRatio: { excellent: 2.0, good: 1.5, fair: 1.0 },
        quickRatio: { excellent: 1.0, good: 0.8, fair: 0.5 },
        grossMargin: { excellent: 0.4, good: 0.3, fair: 0.2 },
        inventoryTurnover: { excellent: 8, good: 6, fair: 4 }
      },
      manufacturing: {
        currentRatio: { excellent: 2.5, good: 2.0, fair: 1.5 },
        quickRatio: { excellent: 1.5, good: 1.0, fair: 0.7 },
        grossMargin: { excellent: 0.35, good: 0.25, fair: 0.15 },
        inventoryTurnover: { excellent: 6, good: 4, fair: 2 }
      },
      service: {
        currentRatio: { excellent: 1.5, good: 1.2, fair: 1.0 },
        quickRatio: { excellent: 1.2, good: 1.0, fair: 0.8 },
        grossMargin: { excellent: 0.5, good: 0.4, fair: 0.3 },
        assetTurnover: { excellent: 2.0, good: 1.5, fair: 1.0 }
      }
    };

    // Industry Analysis Sheet
    const industryAnalysisData = [
      {
        [t('accounting.description')]: t('accounting.industryAnalysis'),
        [t('accounting.amount')]: '',
        [t('accounting.trend')]: '',
        [t('accounting.analysis')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.retailIndustry'),
        [t('accounting.amount')]: '',
        [t('accounting.trend')]: '',
        [t('accounting.analysis')]: ''
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.currentRatio'),
        [t('accounting.amount')]: '=B2',
        [t('accounting.trend')]: `=IF(B3>${industryBenchmarks.retail.currentRatio.excellent},"Excellent",IF(B3>${industryBenchmarks.retail.currentRatio.good},"Good",IF(B3>${industryBenchmarks.retail.currentRatio.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B3>${industryBenchmarks.retail.currentRatio.excellent},"Above industry average",IF(B3>${industryBenchmarks.retail.currentRatio.good},"Industry average",IF(B3>${industryBenchmarks.retail.currentRatio.fair},"Below industry average","Significantly below industry average")))`
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.grossMargin'),
        [t('accounting.amount')]: '=B6',
        [t('accounting.trend')]: `=IF(B4>${industryBenchmarks.retail.grossMargin.excellent},"Excellent",IF(B4>${industryBenchmarks.retail.grossMargin.good},"Good",IF(B4>${industryBenchmarks.retail.grossMargin.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B4>${industryBenchmarks.retail.grossMargin.excellent},"Above industry average",IF(B4>${industryBenchmarks.retail.grossMargin.good},"Industry average",IF(B4>${industryBenchmarks.retail.grossMargin.fair},"Below industry average","Significantly below industry average")))`
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.manufacturingIndustry'),
        [t('accounting.amount')]: '',
        [t('accounting.trend')]: '',
        [t('accounting.analysis')]: ''
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.currentRatio'),
        [t('accounting.amount')]: '=B2',
        [t('accounting.trend')]: `=IF(B6>${industryBenchmarks.manufacturing.currentRatio.excellent},"Excellent",IF(B6>${industryBenchmarks.manufacturing.currentRatio.good},"Good",IF(B6>${industryBenchmarks.manufacturing.currentRatio.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B6>${industryBenchmarks.manufacturing.currentRatio.excellent},"Above industry average",IF(B6>${industryBenchmarks.manufacturing.currentRatio.good},"Industry average",IF(B6>${industryBenchmarks.manufacturing.currentRatio.fair},"Below industry average","Significantly below industry average")))`
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.grossMargin'),
        [t('accounting.amount')]: '=B6',
        [t('accounting.trend')]: `=IF(B7>${industryBenchmarks.manufacturing.grossMargin.excellent},"Excellent",IF(B7>${industryBenchmarks.manufacturing.grossMargin.good},"Good",IF(B7>${industryBenchmarks.manufacturing.grossMargin.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B7>${industryBenchmarks.manufacturing.grossMargin.excellent},"Above industry average",IF(B7>${industryBenchmarks.manufacturing.grossMargin.good},"Industry average",IF(B7>${industryBenchmarks.manufacturing.grossMargin.fair},"Below industry average","Significantly below industry average")))`
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.serviceIndustry'),
        [t('accounting.amount')]: '',
        [t('accounting.trend')]: '',
        [t('accounting.analysis')]: ''
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.currentRatio'),
        [t('accounting.amount')]: '=B2',
        [t('accounting.trend')]: `=IF(B9>${industryBenchmarks.service.currentRatio.excellent},"Excellent",IF(B9>${industryBenchmarks.service.currentRatio.good},"Good",IF(B9>${industryBenchmarks.service.currentRatio.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B9>${industryBenchmarks.service.currentRatio.excellent},"Above industry average",IF(B9>${industryBenchmarks.service.currentRatio.good},"Industry average",IF(B9>${industryBenchmarks.service.currentRatio.fair},"Below industry average","Significantly below industry average")))`
      },
      {
        [t('accounting.description')]: '    ' + t('accounting.grossMargin'),
        [t('accounting.amount')]: '=B6',
        [t('accounting.trend')]: `=IF(B10>${industryBenchmarks.service.grossMargin.excellent},"Excellent",IF(B10>${industryBenchmarks.service.grossMargin.good},"Good",IF(B10>${industryBenchmarks.service.grossMargin.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B10>${industryBenchmarks.service.grossMargin.excellent},"Above industry average",IF(B10>${industryBenchmarks.service.grossMargin.good},"Industry average",IF(B10>${industryBenchmarks.service.grossMargin.fair},"Below industry average","Significantly below industry average")))`
      }
    ];

    // Enhanced Financial Ratios and Performance Metrics
    const financialRatiosData = [
      {
        [t('accounting.description')]: t('accounting.liquidityRatios'),
        [t('accounting.amount')]: '',
        [t('accounting.trend')]: '',
        [t('accounting.analysis')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.currentRatio'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Current Assets*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Current Liabilities*")',
        [t('accounting.trend')]: '=IF(B2>1.5,"Good",IF(B2>1,"Fair","Poor"))',
        [t('accounting.analysis')]: '=IF(B2>1.5,"Strong liquidity position",IF(B2>1,"Adequate liquidity","Potential liquidity issues"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.quickRatio'),
        [t('accounting.amount')]: '=(SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Cash*")+SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Accounts Receivable*"))/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Current Liabilities*")',
        [t('accounting.trend')]: '=IF(B3>1,"Good",IF(B3>0.5,"Fair","Poor"))',
        [t('accounting.analysis')]: '=IF(B3>1,"Strong immediate liquidity",IF(B3>0.5,"Adequate immediate liquidity","Potential immediate liquidity issues"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.cashRatio'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Cash*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Current Liabilities*")',
        [t('accounting.trend')]: '=IF(B4>0.5,"Good",IF(B4>0.2,"Fair","Poor"))',
        [t('accounting.analysis')]: '=IF(B4>0.5,"Strong cash position",IF(B4>0.2,"Adequate cash reserves","Low cash reserves - potential risk"))'
      },
      {
        [t('accounting.description')]: t('accounting.profitabilityRatios'),
        [t('accounting.amount')]: '',
        [t('accounting.trend')]: '',
        [t('accounting.analysis')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.grossProfitMargin'),
        [t('accounting.amount')]: '=(SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")-SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Cost of Goods Sold*"))/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")',
        [t('accounting.trend')]: '=IF(B6>0.3,"Excellent",IF(B6>0.2,"Good",IF(B6>0.1,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B6>0.3,"Strong pricing power and cost control",IF(B6>0.2,"Good profitability",IF(B6>0.1,"Marginal profitability","Low profitability")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.operatingMargin'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Operating Income*")/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")',
        [t('accounting.trend')]: '=IF(B7>0.2,"Excellent",IF(B7>0.1,"Good",IF(B7>0.05,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B7>0.2,"Exceptional operational efficiency",IF(B7>0.1,"Good operational performance",IF(B7>0.05,"Adequate operations","Inefficient operations")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.netProfitMargin'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Net Income*")/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")',
        [t('accounting.trend')]: '=IF(B8>0.15,"Excellent",IF(B8>0.1,"Good",IF(B8>0.05,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B8>0.15,"Exceptional overall profitability",IF(B8>0.1,"Strong overall profitability",IF(B8>0.05,"Adequate profitability","Low overall profitability")))'
      },
      {
        [t('accounting.description')]: t('accounting.efficiencyRatios'),
        [t('accounting.amount')]: '',
        [t('accounting.trend')]: '',
        [t('accounting.analysis')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.assetTurnover'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Total Assets*")',
        [t('accounting.trend')]: '=IF(B10>1.5,"Excellent",IF(B10>1,"Good",IF(B10>0.5,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B10>1.5,"Highly efficient asset utilization",IF(B10>1,"Good asset utilization",IF(B10>0.5,"Adequate asset utilization","Inefficient asset utilization")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.inventoryTurnover'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Cost of Goods Sold*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Inventory*")',
        [t('accounting.trend')]: '=IF(B11>6,"Excellent",IF(B11>4,"Good",IF(B11>2,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B11>6,"Highly efficient inventory management",IF(B11>4,"Good inventory turnover",IF(B11>2,"Adequate inventory turnover","Slow inventory turnover")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.receivablesTurnover'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Accounts Receivable*")',
        [t('accounting.trend')]: '=IF(B12>12,"Excellent",IF(B12>8,"Good",IF(B12>4,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B12>12,"Excellent receivables collection",IF(B12>8,"Good receivables management",IF(B12>4,"Adequate receivables turnover","Slow receivables collection")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.payablesTurnover'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Cost of Goods Sold*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Accounts Payable*")',
        [t('accounting.trend')]: '=IF(B13>12,"Excellent",IF(B13>8,"Good",IF(B13>4,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B13>12,"Efficient payables management",IF(B13>8,"Good payables turnover",IF(B13>4,"Adequate payables turnover","Slow payables turnover")))'
      },
      {
        [t('accounting.description')]: t('accounting.solvencyRatios'),
        [t('accounting.amount')]: '',
        [t('accounting.trend')]: '',
        [t('accounting.analysis')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.debtToEquity'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Liabilities*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Equity*")',
        [t('accounting.trend')]: '=IF(B15<1,"Good",IF(B15<2,"Fair","Poor"))',
        [t('accounting.analysis')]: '=IF(B15<1,"Conservative capital structure",IF(B15<2,"Moderate leverage","High leverage - potential risk"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.debtRatio'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Liabilities*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Assets*")',
        [t('accounting.trend')]: '=IF(B16<0.5,"Good",IF(B16<0.7,"Fair","Poor"))',
        [t('accounting.analysis')]: '=IF(B16<0.5,"Strong financial position",IF(B16<0.7,"Moderate financial position","High financial risk"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.interestCoverage'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Operating Income*")/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Interest Expense*")',
        [t('accounting.trend')]: '=IF(B17>3,"Good",IF(B17>1.5,"Fair","Poor"))',
        [t('accounting.analysis')]: '=IF(B17>3,"Strong ability to service debt",IF(B17>1.5,"Adequate debt service capacity","Potential debt service issues"))'
      },
      {
        [t('accounting.description')]: t('accounting.marketRatios'),
        [t('accounting.amount')]: '',
        [t('accounting.trend')]: '',
        [t('accounting.analysis')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.earningsPerShare'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Net Income*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Shares Outstanding*")',
        [t('accounting.trend')]: '=IF(B19>0,"Positive","Negative")',
        [t('accounting.analysis')]: '=IF(B19>0,"Profitable per share","Loss per share")'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.priceToEarnings'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("MarketData!B:B"),INDIRECT("MarketData!A:A"),"*Stock Price*")/B19',
        [t('accounting.trend')]: '=IF(B20<15,"Undervalued",IF(B20<25,"Fairly valued","Overvalued"))',
        [t('accounting.analysis')]: '=IF(B20<15,"Potential investment opportunity",IF(B20<25,"Market aligned","Potential overvaluation"))'
      }
    ];

    // Industry-specific cash flow benchmarks
    const industryCashFlowBenchmarks = {
      retail: {
        operatingCashFlowMargin: { excellent: 0.15, good: 0.1, fair: 0.05 },
        cashConversionCycle: { excellent: 30, good: 45, fair: 60 },
        workingCapitalRatio: { excellent: 2.0, good: 1.5, fair: 1.0 },
        dso: { excellent: 30, good: 45, fair: 60 },
        dio: { excellent: 30, good: 45, fair: 60 },
        dpo: { excellent: 45, good: 30, fair: 15 }
      },
      manufacturing: {
        operatingCashFlowMargin: { excellent: 0.2, good: 0.15, fair: 0.1 },
        cashConversionCycle: { excellent: 45, good: 60, fair: 75 },
        workingCapitalRatio: { excellent: 2.5, good: 2.0, fair: 1.5 },
        dso: { excellent: 45, good: 60, fair: 75 },
        dio: { excellent: 45, good: 60, fair: 75 },
        dpo: { excellent: 60, good: 45, fair: 30 }
      },
      service: {
        operatingCashFlowMargin: { excellent: 0.25, good: 0.2, fair: 0.15 },
        cashConversionCycle: { excellent: 15, good: 30, fair: 45 },
        workingCapitalRatio: { excellent: 1.5, good: 1.2, fair: 1.0 },
        dso: { excellent: 15, good: 30, fair: 45 },
        dio: { excellent: 0, good: 0, fair: 0 },
        dpo: { excellent: 30, good: 15, fair: 0 }
      }
    };

    // Enhanced Market Performance Metrics
    const marketMetricsData = [
      {
        [t('accounting.description')]: t('accounting.marketPerformance'),
        [t('accounting.amount')]: '',
        [t('accounting.trend')]: '',
        [t('accounting.analysis')]: ''
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.marketCapitalization'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("MarketData!B:B"),INDIRECT("MarketData!A:A"),"*Stock Price*")*SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Shares Outstanding*")',
        [t('accounting.trend')]: '=IF(B2>1000000000,"Large Cap",IF(B2>500000000,"Mid Cap","Small Cap"))',
        [t('accounting.analysis')]: '=IF(B2>1000000000,"Large market presence",IF(B2>500000000,"Moderate market presence","Small market presence"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.enterpriseValue'),
        [t('accounting.amount')]: '=B2+SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Debt*")-SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Cash*")',
        [t('accounting.trend')]: '=IF(B3/B2<1.5,"Conservative",IF(B3/B2<2,"Moderate","Aggressive"))',
        [t('accounting.analysis')]: '=IF(B3/B2<1.5,"Conservative capital structure",IF(B3/B2<2,"Moderate leverage","High leverage - potential risk"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.priceToBook'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("MarketData!B:B"),INDIRECT("MarketData!A:A"),"*Stock Price*")/(SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Equity*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Shares Outstanding*"))',
        [t('accounting.trend')]: '=IF(B4<1,"Undervalued",IF(B4<2,"Fairly valued","Overvalued"))',
        [t('accounting.analysis')]: '=IF(B4<1,"Potential value investment",IF(B4<2,"Market aligned","Potential overvaluation"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.priceToSales'),
        [t('accounting.amount')]: '=B2/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")',
        [t('accounting.trend')]: '=IF(B5<1,"Undervalued",IF(B5<3,"Fairly valued","Overvalued"))',
        [t('accounting.analysis')]: '=IF(B5<1,"Potential value opportunity",IF(B5<3,"Market aligned","Potential overvaluation"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.dividendYield'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Dividends*")/SUMIFS(INDIRECT("MarketData!B:B"),INDIRECT("MarketData!A:A"),"*Stock Price*")',
        [t('accounting.trend')]: '=IF(B6>0.05,"High",IF(B6>0.02,"Moderate","Low"))',
        [t('accounting.analysis')]: '=IF(B6>0.05,"Attractive for income investors",IF(B6>0.02,"Moderate income potential","Low income potential"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.pegRatio'),
        [t('accounting.amount')]: '=B4/(SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Net Income Growth*")*100)',
        [t('accounting.trend')]: '=IF(B7<1,"Undervalued",IF(B7<2,"Fairly valued","Overvalued"))',
        [t('accounting.analysis')]: '=IF(B7<1,"Growth at reasonable price",IF(B7<2,"Market aligned","Potential overvaluation"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.beta'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("MarketData!B:B"),INDIRECT("MarketData!A:A"),"*Beta*")',
        [t('accounting.trend')]: '=IF(B8<0.8,"Defensive",IF(B8<1.2,"Market",IF(B8<1.5,"Aggressive","Highly Volatile")))',
        [t('accounting.analysis')]: '=IF(B8<0.8,"Lower market risk",IF(B8<1.2,"Market risk",IF(B8<1.5,"Higher market risk","Very high market risk")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.returnOnEquity'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Net Income*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Equity*")',
        [t('accounting.trend')]: '=IF(B9>0.15,"Excellent",IF(B9>0.1,"Good",IF(B9>0.05,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B9>0.15,"Exceptional return to shareholders",IF(B9>0.1,"Good return to shareholders",IF(B9>0.05,"Adequate return","Poor return")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.returnOnAssets'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Net Income*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Total Assets*")',
        [t('accounting.trend')]: '=IF(B10>0.1,"Excellent",IF(B10>0.05,"Good",IF(B10>0,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B10>0.1,"Highly efficient asset utilization",IF(B10>0.05,"Good asset utilization",IF(B10>0,"Adequate utilization","Inefficient utilization")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.freeCashFlow'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("CashFlow!B:B"),INDIRECT("CashFlow!A:A"),"*Operating Cash Flow*")-SUMIFS(INDIRECT("CashFlow!B:B"),INDIRECT("CashFlow!A:A"),"*Capital Expenditures*")',
        [t('accounting.trend')]: '=IF(B11>0,"Positive",IF(B11=0,"Neutral","Negative"))',
        [t('accounting.analysis')]: '=IF(B11>0,"Generating positive free cash flow",IF(B11=0,"Breaking even","Negative cash flow - potential concern"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.freeCashFlowYield'),
        [t('accounting.amount')]: '=B11/B2',
        [t('accounting.trend')]: '=IF(B12>0.05,"High",IF(B12>0.02,"Moderate","Low"))',
        [t('accounting.analysis')]: '=IF(B12>0.05,"Attractive cash flow yield",IF(B12>0.02,"Moderate cash flow yield","Low cash flow yield"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.freeCashFlowToEquity'),
        [t('accounting.amount')]: '=B11/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Equity*")',
        [t('accounting.trend')]: '=IF(B13>0.1,"Excellent",IF(B13>0.05,"Good",IF(B13>0,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B13>0.1,"Strong cash flow to equity",IF(B13>0.05,"Good cash flow generation",IF(B13>0,"Adequate cash flow","Poor cash flow generation")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.ebitda'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Operating Income*")+SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Depreciation*")+SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Amortization*")',
        [t('accounting.trend')]: '=IF(B14>0,"Positive",IF(B14=0,"Neutral","Negative"))',
        [t('accounting.analysis')]: '=IF(B14>0,"Strong operating performance",IF(B14=0,"Breaking even","Negative operating performance"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.evToEbitda'),
        [t('accounting.amount')]: '=B3/B14',
        [t('accounting.trend')]: '=IF(B15<10,"Undervalued",IF(B15<15,"Fairly valued","Overvalued"))',
        [t('accounting.analysis')]: '=IF(B15<10,"Potential value opportunity",IF(B15<15,"Market aligned","Potential overvaluation"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.ebitdaMargin'),
        [t('accounting.amount')]: '=B14/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")',
        [t('accounting.trend')]: '=IF(B16>0.2,"Excellent",IF(B16>0.1,"Good",IF(B16>0.05,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B16>0.2,"Exceptional operating efficiency",IF(B16>0.1,"Good operating performance",IF(B16>0.05,"Adequate performance","Poor operating efficiency")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.operatingCashFlow'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("CashFlow!B:B"),INDIRECT("CashFlow!A:A"),"*Operating Cash Flow*")',
        [t('accounting.trend')]: '=IF(B17>0,"Positive",IF(B17=0,"Neutral","Negative"))',
        [t('accounting.analysis')]: '=IF(B17>0,"Strong operating cash generation",IF(B17=0,"Breaking even","Negative operating cash flow - potential concern"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.capitalExpenditures'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("CashFlow!B:B"),INDIRECT("CashFlow!A:A"),"*Capital Expenditures*")',
        [t('accounting.trend')]: '=IF(B18<0,"Investment",IF(B18=0,"Maintenance","Disinvestment"))',
        [t('accounting.analysis')]: '=IF(B18<0,"Growth investment",IF(B18=0,"Maintenance only","Asset disposal"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.workingCapital'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Current Assets*")-SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Current Liabilities*")',
        [t('accounting.trend')]: '=IF(B19>0,"Positive",IF(B19=0,"Neutral","Negative"))',
        [t('accounting.analysis')]: '=IF(B19>0,"Adequate working capital",IF(B19=0,"Minimal working capital","Insufficient working capital"))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.workingCapitalRatio'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Current Assets*")/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Current Liabilities*")',
        [t('accounting.trend')]: '=IF(B20>2,"Excellent",IF(B20>1.5,"Good",IF(B20>1,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B20>2,"Strong liquidity position",IF(B20>1.5,"Good liquidity",IF(B20>1,"Adequate liquidity","Potential liquidity issues")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.cashConversionCycle'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Inventory*")/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Cost of Goods Sold*")*365+SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Accounts Receivable*")/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")*365-SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Accounts Payable*")/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Cost of Goods Sold*")*365',
        [t('accounting.trend')]: '=IF(B21<30,"Excellent",IF(B21<60,"Good",IF(B21<90,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B21<30,"Efficient cash conversion",IF(B21<60,"Good cash management",IF(B21<90,"Adequate cash cycle","Inefficient cash conversion")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.daysSalesOutstanding'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Accounts Receivable*")/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")*365',
        [t('accounting.trend')]: '=IF(B22<30,"Excellent",IF(B22<45,"Good",IF(B22<60,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B22<30,"Efficient receivables collection",IF(B22<45,"Good receivables management",IF(B22<60,"Adequate collection period","Slow receivables collection")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.daysInventoryOutstanding'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Inventory*")/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Cost of Goods Sold*")*365',
        [t('accounting.trend')]: '=IF(B23<30,"Excellent",IF(B23<45,"Good",IF(B23<60,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B23<30,"Efficient inventory management",IF(B23<45,"Good inventory turnover",IF(B23<60,"Adequate inventory period","Slow inventory turnover")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.daysPayableOutstanding'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Accounts Payable*")/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Cost of Goods Sold*")*365',
        [t('accounting.trend')]: '=IF(B24>45,"Excellent",IF(B24>30,"Good",IF(B24>15,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B24>45,"Efficient payables management",IF(B24>30,"Good payables period",IF(B24>15,"Adequate payment terms","Short payment terms")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.operatingCashFlowMargin'),
        [t('accounting.amount')]: '=B17/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")',
        [t('accounting.trend')]: `=IF(B25>${industryCashFlowBenchmarks.retail.operatingCashFlowMargin.excellent},"Excellent",IF(B25>${industryCashFlowBenchmarks.retail.operatingCashFlowMargin.good},"Good",IF(B25>${industryCashFlowBenchmarks.retail.operatingCashFlowMargin.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B25>${industryCashFlowBenchmarks.retail.operatingCashFlowMargin.excellent},"Above industry average",IF(B25>${industryCashFlowBenchmarks.retail.operatingCashFlowMargin.good},"Industry average",IF(B25>${industryCashFlowBenchmarks.retail.operatingCashFlowMargin.fair},"Below industry average","Significantly below industry average")))`
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.cashFlowCoverage'),
        [t('accounting.amount')]: '=B17/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Interest Expense*")',
        [t('accounting.trend')]: '=IF(B26>3,"Excellent",IF(B26>2,"Good",IF(B26>1,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B26>3,"Strong ability to service debt",IF(B26>2,"Good debt service capacity",IF(B26>1,"Adequate coverage","Potential debt service issues")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.cashFlowToDebt'),
        [t('accounting.amount')]: '=B17/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Total Debt*")',
        [t('accounting.trend')]: '=IF(B27>0.2,"Excellent",IF(B27>0.15,"Good",IF(B27>0.1,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B27>0.2,"Strong debt repayment capacity",IF(B27>0.15,"Good debt management",IF(B27>0.1,"Adequate repayment ability","Potential debt repayment issues")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.cashFlowToRevenue'),
        [t('accounting.amount')]: '=B17/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")',
        [t('accounting.trend')]: '=IF(B28>0.15,"Excellent",IF(B28>0.1,"Good",IF(B28>0.05,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B28>0.15,"Strong cash generation from sales",IF(B28>0.1,"Good cash conversion",IF(B28>0.05,"Adequate cash flow","Poor cash conversion")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.cashFlowToAssets'),
        [t('accounting.amount')]: '=B17/SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Total Assets*")',
        [t('accounting.trend')]: '=IF(B29>0.1,"Excellent",IF(B29>0.05,"Good",IF(B29>0,"Fair","Poor")))',
        [t('accounting.analysis')]: '=IF(B29>0.1,"Efficient asset utilization",IF(B29>0.05,"Good asset efficiency",IF(B29>0,"Adequate utilization","Inefficient asset utilization")))'
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.capitalIntensity'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("BalanceSheet!B:B"),INDIRECT("BalanceSheet!A:A"),"*Fixed Assets*")/SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")',
        [t('accounting.trend')]: `=IF(B30<${industryMetrics.retail.capitalIntensity.excellent},"Excellent",IF(B30<${industryMetrics.retail.capitalIntensity.good},"Good",IF(B30<${industryMetrics.retail.capitalIntensity.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B30<${industryMetrics.retail.capitalIntensity.excellent},"Efficient capital utilization",IF(B30<${industryMetrics.retail.capitalIntensity.good},"Good capital efficiency",IF(B30<${industryMetrics.retail.capitalIntensity.fair},"Adequate utilization","Inefficient capital utilization")))`
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.employeeProductivity'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("ProfitAndLoss!B:B"),INDIRECT("ProfitAndLoss!A:A"),"*Sales*")/SUMIFS(INDIRECT("HR!B:B"),INDIRECT("HR!A:A"),"*Total Employees*")',
        [t('accounting.trend')]: `=IF(B31>${industryMetrics.retail.employeeProductivity.excellent},"Excellent",IF(B31>${industryMetrics.retail.employeeProductivity.good},"Good",IF(B31>${industryMetrics.retail.employeeProductivity.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B31>${industryMetrics.retail.employeeProductivity.excellent},"High employee productivity",IF(B31>${industryMetrics.retail.employeeProductivity.good},"Good productivity",IF(B31>${industryMetrics.retail.employeeProductivity.fair},"Adequate productivity","Low productivity")))`
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.capacityUtilization'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("Production!B:B"),INDIRECT("Production!A:A"),"*Actual Output*")/SUMIFS(INDIRECT("Production!B:B"),INDIRECT("Production!A:A"),"*Maximum Output*")',
        [t('accounting.trend')]: `=IF(B32>${industryMetrics.manufacturing.capacityUtilization.excellent},"Excellent",IF(B32>${industryMetrics.manufacturing.capacityUtilization.good},"Good",IF(B32>${industryMetrics.manufacturing.capacityUtilization.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B32>${industryMetrics.manufacturing.capacityUtilization.excellent},"Optimal capacity utilization",IF(B32>${industryMetrics.manufacturing.capacityUtilization.good},"Good utilization",IF(B32>${industryMetrics.manufacturing.capacityUtilization.fair},"Adequate utilization","Underutilized capacity")))`
      },
      {
        [t('accounting.description')]: '  ' + t('accounting.customerRetention'),
        [t('accounting.amount')]: '=SUMIFS(INDIRECT("Sales!B:B"),INDIRECT("Sales!A:A"),"*Repeat Customers*")/SUMIFS(INDIRECT("Sales!B:B"),INDIRECT("Sales!A:A"),"*Total Customers*")',
        [t('accounting.trend')]: `=IF(B33>${industryMetrics.service.customerRetention.excellent},"Excellent",IF(B33>${industryMetrics.service.customerRetention.good},"Good",IF(B33>${industryMetrics.service.customerRetention.fair},"Fair","Poor")))`,
        [t('accounting.analysis')]: `=IF(B33>${industryMetrics.service.customerRetention.excellent},"Strong customer loyalty",IF(B33>${industryMetrics.service.customerRetention.good},"Good retention",IF(B33>${industryMetrics.service.customerRetention.fair},"Adequate retention","Poor customer retention")))`
      }
    ];

    // Enhanced helper function to add formatting, formulas, charts, and sparklines
    const addFormatting = (worksheet: XLSX.WorkSheet, data: any[]) => {
      // Add column widths
      const colWidths = [
        { wch: 40 }, // Description column
        { wch: 15 }, // Current Period column
        { wch: 15 }, // Previous Period column
        { wch: 15 }, // Change column
        { wch: 15 }, // Trend column
        { wch: 50 }  // Analysis column
      ];
      worksheet['!cols'] = colWidths;

      // Add cell styles, formulas, and conditional formatting
      data.forEach((row, rowIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
        const cell = worksheet[cellRef];
        if (cell) {
          // Bold for headers and main categories
          if (!row[t('accounting.currentPeriod')] || row[t('accounting.currentPeriod')] === '') {
            cell.s = { font: { bold: true } };
          }
          // Indentation for subcategories
          if (row[t('accounting.description')].startsWith('  ')) {
            cell.s = { ...cell.s, alignment: { indent: 1 } };
          }
          if (row[t('accounting.description')].startsWith('    ')) {
            cell.s = { ...cell.s, alignment: { indent: 2 } };
          }
        }

        // Add formulas for calculations
        if (row[t('accounting.currentPeriod')] && row[t('accounting.currentPeriod')].startsWith('=')) {
          const currentCellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
          worksheet[currentCellRef] = {
            t: 'n',
            f: row[t('accounting.currentPeriod')],
            s: { numFmt: '#,##0.00' }
          };
        }

        // Add trend and analysis formulas
        if (row[t('accounting.trend')] && row[t('accounting.trend')].startsWith('=')) {
          const trendCellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 4 });
          worksheet[trendCellRef] = {
            t: 's',
            f: row[t('accounting.trend')],
            s: { 
              font: { 
                color: { 
                  rgb: '=IF(E' + (rowIndex + 1) + '="Strong Growth","008000",IF(E' + (rowIndex + 1) + '="Growth","0066CC",IF(E' + (rowIndex + 1) + '="Decline","FF9900","FF0000")))' 
                } 
              } 
            }
          };
        }

        if (row[t('accounting.analysis')] && row[t('accounting.analysis')].startsWith('=')) {
          const analysisCellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 5 });
          worksheet[analysisCellRef] = {
            t: 's',
            f: row[t('accounting.analysis')]
          };
        }

        // Add data validation and conditional formatting
        if (row[t('accounting.amount')] && row[t('accounting.amount')].startsWith('=')) {
          cell.dv = {
            type: 'decimal',
            operator: 'greaterThan',
            value: 0,
            showErrorMessage: true,
            errorTitle: 'Invalid Value',
            error: 'Please enter a positive number'
          };
        }

        // Add enhanced conditional formatting
        if (row[t('accounting.trend')] && row[t('accounting.trend')].startsWith('=')) {
          cell.cf = [
            {
              type: 'cellIs',
              operator: 'greaterThan',
              value: 0,
              style: { font: { color: { rgb: '008000' } } }
            },
            {
              type: 'cellIs',
              operator: 'lessThan',
              value: 0,
              style: { font: { color: { rgb: 'FF0000' } } }
            },
            {
              type: 'cellIs',
              operator: 'equalTo',
              value: 0,
              style: { font: { color: { rgb: '000000' } } }
            }
          ];
        }

        // Add sparklines for trend visualization
        if (row[t('accounting.amount')] && row[t('accounting.amount')].startsWith('=')) {
          const sparklineRef = XLSX.utils.encode_cell({ r: rowIndex, c: 5 });
          worksheet[sparklineRef] = {
            t: 's',
            f: `=SPARKLINE(OFFSET(${cellRef},0,-4):${cellRef},{"charttype","line";"color","#2196F3"})`
          };
        }
      });

      // Add enhanced charts for market metrics
      if (worksheet === marketMetricsSheet) {
        const charts = [
          {
            type: 'bar',
            data: {
              labels: ['Operating CF', 'Capital Exp', 'Working Capital', 'WC Ratio', 'Cash Cycle', 'DSO', 'DIO', 'DPO'],
              datasets: [
                {
                  label: 'Current',
                  data: ['=B17', '=B18', '=B19', '=B20', '=B21', '=B22', '=B23', '=B24'],
                  backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0', '#00BCD4', '#795548', '#607D8B']
                }
              ]
            },
            options: {
              title: { display: true, text: 'Working Capital and Cash Flow Metrics' },
              scales: { yAxes: [{ ticks: { beginAtZero: true } }] }
            }
          },
          {
            type: 'line',
            data: {
              labels: ['Q1', 'Q2', 'Q3', 'Q4'],
              datasets: [
                {
                  label: 'Operating Cash Flow',
                  data: ['=OFFSET(B17,0,-1)', '=OFFSET(B17,0,-2)', '=OFFSET(B17,0,-3)', '=OFFSET(B17,0,-4)'],
                  borderColor: '#2196F3',
                  fill: false
                },
                {
                  label: 'Working Capital',
                  data: ['=OFFSET(B19,0,-1)', '=OFFSET(B19,0,-2)', '=OFFSET(B19,0,-3)', '=OFFSET(B19,0,-4)'],
                  borderColor: '#4CAF50',
                  fill: false
                },
                {
                  label: 'Cash Conversion Cycle',
                  data: ['=OFFSET(B21,0,-1)', '=OFFSET(B21,0,-2)', '=OFFSET(B21,0,-3)', '=OFFSET(B21,0,-4)'],
                  borderColor: '#FF5722',
                  fill: false
                }
              ]
            },
            options: {
              title: { display: true, text: 'Cash Flow and Working Capital Trends' },
              scales: { yAxes: [{ ticks: { beginAtZero: true } }] }
            }
          },
          {
            type: 'radar',
            data: {
              labels: ['Working Capital Ratio', 'Cash Conversion Cycle', 'DSO', 'DIO', 'DPO'],
              datasets: [
                {
                  label: 'Current',
                  data: ['=B20', '=B21', '=B22', '=B23', '=B24'],
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                  pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                  pointBorderColor: '#fff',
                  pointHoverBackgroundColor: '#fff',
                  pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
                }
              ]
            },
            options: {
              title: { display: true, text: 'Working Capital Efficiency' },
              scale: {
                ticks: { beginAtZero: true }
              }
            }
          },
          {
            type: 'bar',
            data: {
              labels: ['Operating CF Margin', 'Cash Flow Coverage', 'Cash Flow to Debt', 'Cash Flow to Revenue', 'Cash Flow to Assets'],
              datasets: [
                {
                  label: 'Current',
                  data: ['=B25', '=B26', '=B27', '=B28', '=B29'],
                  backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0']
                }
              ]
            },
            options: {
              title: { display: true, text: 'Cash Flow Coverage Ratios' },
              scales: { yAxes: [{ ticks: { beginAtZero: true } }] }
            }
          },
          {
            type: 'line',
            data: {
              labels: ['Q1', 'Q2', 'Q3', 'Q4'],
              datasets: [
                {
                  label: 'Operating Cash Flow Margin',
                  data: ['=OFFSET(B25,0,-1)', '=OFFSET(B25,0,-2)', '=OFFSET(B25,0,-3)', '=OFFSET(B25,0,-4)'],
                  borderColor: '#2196F3',
                  fill: false
                },
                {
                  label: 'Cash Flow Coverage',
                  data: ['=OFFSET(B26,0,-1)', '=OFFSET(B26,0,-2)', '=OFFSET(B26,0,-3)', '=OFFSET(B26,0,-4)'],
                  borderColor: '#4CAF50',
                  fill: false
                },
                {
                  label: 'Cash Flow to Debt',
                  data: ['=OFFSET(B27,0,-1)', '=OFFSET(B27,0,-2)', '=OFFSET(B27,0,-3)', '=OFFSET(B27,0,-4)'],
                  borderColor: '#FF5722',
                  fill: false
                }
              ]
            },
            options: {
              title: { display: true, text: 'Cash Flow Coverage Trends' },
              scales: { yAxes: [{ ticks: { beginAtZero: true } }] }
            }
          },
          {
            type: 'radar',
            data: {
              labels: ['Operating CF Margin', 'Cash Flow Coverage', 'Cash Flow to Debt', 'Cash Flow to Revenue', 'Cash Flow to Assets'],
              datasets: [
                {
                  label: 'Current',
                  data: ['=B25', '=B26', '=B27', '=B28', '=B29'],
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                  pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                  pointBorderColor: '#fff',
                  pointHoverBackgroundColor: '#fff',
                  pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
                }
              ]
            },
            options: {
              title: { display: true, text: 'Cash Flow Performance Overview' },
              scale: {
                ticks: { beginAtZero: true }
              }
            }
          },
          {
            type: 'bar',
            data: {
              labels: ['Capital Intensity', 'Employee Productivity', 'Capacity Utilization', 'Customer Retention'],
              datasets: [
                {
                  label: 'Current',
                  data: ['=B30', '=B31', '=B32', '=B33'],
                  backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#FF5722']
                }
              ]
            },
            options: {
              title: { display: true, text: 'Industry-Specific Performance Metrics' },
              scales: { yAxes: [{ ticks: { beginAtZero: true } }] }
            }
          },
          {
            type: 'line',
            data: {
              labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'],
              datasets: [
                {
                  label: 'Capital Intensity',
                  data: ['=OFFSET(B30,0,-1)', '=OFFSET(B30,0,-2)', '=OFFSET(B30,0,-3)', '=OFFSET(B30,0,-4)', '=OFFSET(B30,0,-5)', '=OFFSET(B30,0,-6)', '=OFFSET(B30,0,-7)', '=OFFSET(B30,0,-8)'],
                  borderColor: '#2196F3',
                  fill: false
                },
                {
                  label: 'Employee Productivity',
                  data: ['=OFFSET(B31,0,-1)', '=OFFSET(B31,0,-2)', '=OFFSET(B31,0,-3)', '=OFFSET(B31,0,-4)', '=OFFSET(B31,0,-5)', '=OFFSET(B31,0,-6)', '=OFFSET(B31,0,-7)', '=OFFSET(B31,0,-8)'],
                  borderColor: '#4CAF50',
                  fill: false
                },
                {
                  label: 'Customer Retention',
                  data: ['=OFFSET(B33,0,-1)', '=OFFSET(B33,0,-2)', '=OFFSET(B33,0,-3)', '=OFFSET(B33,0,-4)', '=OFFSET(B33,0,-5)', '=OFFSET(B33,0,-6)', '=OFFSET(B33,0,-7)', '=OFFSET(B33,0,-8)'],
                  borderColor: '#FF5722',
                  fill: false
                }
              ]
            },
            options: {
              title: { display: true, text: 'Long-term Performance Trends' },
              scales: { yAxes: [{ ticks: { beginAtZero: true } }] }
            }
          },
          {
            type: 'radar',
            data: {
              labels: ['Capital Intensity', 'Employee Productivity', 'Capacity Utilization', 'Customer Retention', 'Cash Flow Margin', 'Working Capital Ratio'],
              datasets: [
                {
                  label: 'Current',
                  data: ['=B30', '=B31', '=B32', '=B33', '=B25', '=B20'],
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                  pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                  pointBorderColor: '#fff',
                  pointHoverBackgroundColor: '#fff',
                  pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
                }
              ]
            },
            options: {
              title: { display: true, text: 'Comprehensive Performance Overview' },
              scale: {
                ticks: { beginAtZero: true }
              }
            }
          }
        ];

        worksheet['!charts'] = charts;
      }
    };

    // Create a workbook with multiple sheets
    const workbook = XLSX.utils.book_new();

    // Add Trend Analysis sheet
    const trendAnalysisSheet = XLSX.utils.json_to_sheet(trendAnalysisData, {
      header: [
        t('accounting.description'),
        t('accounting.currentPeriod'),
        t('accounting.previousPeriod'),
        t('accounting.change'),
        t('accounting.trend'),
        t('accounting.analysis')
      ]
    });
    addFormatting(trendAnalysisSheet, trendAnalysisData);
    XLSX.utils.book_append_sheet(workbook, trendAnalysisSheet, t('accounting.trendAnalysis'));

    // Add all sheets with formatting
    const trialBalanceSheet = XLSX.utils.json_to_sheet(trialBalanceData, {
      header: [t('accounting.account'), t('accounting.debit'), t('accounting.credit')]
    });
    addFormatting(trialBalanceSheet, trialBalanceData);
    XLSX.utils.book_append_sheet(workbook, trialBalanceSheet, t('accounting.trialBalance'));

    const profitLossSheet = XLSX.utils.json_to_sheet(profitLossData, {
      header: [t('accounting.description'), t('accounting.amount')]
    });
    addFormatting(profitLossSheet, profitLossData);
    XLSX.utils.book_append_sheet(workbook, profitLossSheet, t('accounting.profitAndLoss'));

    const balanceSheet = XLSX.utils.json_to_sheet(balanceSheetData, {
      header: [t('accounting.description'), t('accounting.amount')]
    });
    addFormatting(balanceSheet, balanceSheetData);
    XLSX.utils.book_append_sheet(workbook, balanceSheet, t('accounting.balanceSheet'));

    const cashFlowSheet = XLSX.utils.json_to_sheet(cashFlowData, {
      header: [t('accounting.description'), t('accounting.amount')]
    });
    addFormatting(cashFlowSheet, cashFlowData);
    XLSX.utils.book_append_sheet(workbook, cashFlowSheet, t('accounting.cashFlow'));

    // Add Industry Analysis sheet
    const industryAnalysisSheet = XLSX.utils.json_to_sheet(industryAnalysisData, {
      header: [
        t('accounting.description'),
        t('accounting.amount'),
        t('accounting.trend'),
        t('accounting.analysis')
      ]
    });
    addFormatting(industryAnalysisSheet, industryAnalysisData);
    XLSX.utils.book_append_sheet(workbook, industryAnalysisSheet, t('accounting.industryAnalysis'));

    // Add Financial Ratios sheet with enhanced formatting and charts
    const ratiosSheet = XLSX.utils.json_to_sheet(financialRatiosData, {
      header: [
        t('accounting.description'),
        t('accounting.amount'),
        t('accounting.trend'),
        t('accounting.analysis')
      ]
    });
    addFormatting(ratiosSheet, financialRatiosData);
    XLSX.utils.book_append_sheet(workbook, ratiosSheet, t('accounting.financialRatios'));

    // Add Market Metrics sheet
    const marketMetricsSheet = XLSX.utils.json_to_sheet(marketMetricsData, {
      header: [
        t('accounting.description'),
        t('accounting.amount'),
        t('accounting.trend'),
        t('accounting.analysis')
      ]
    });
    addFormatting(marketMetricsSheet, marketMetricsData);
    XLSX.utils.book_append_sheet(workbook, marketMetricsSheet, t('accounting.marketMetrics'));

    // Generate Excel file
    XLSX.writeFile(workbook, `financial-reports-${dateRange.from}-to-${dateRange.to}.xlsx`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('accounting.title')}</h1>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-2 py-1 border rounded"
            />
            <span>{t('accounting.to')}</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-2 py-1 border rounded"
            />
          </div>
          {activeTab === 'ledger' && (
            <button
              onClick={handleExportLedgerExcel}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              {t('accounting.export')} Excel
            </button>
          )}
          {activeTab === 'journal' && (
            <button
              onClick={handleExportJournalExcel}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              {t('accounting.export')} Excel
            </button>
          )}
          {activeTab === 'reports' && (
            <button
              onClick={handleExportReportsExcel}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              {t('accounting.export')} Excel
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {showForm ? t('accounting.cancel') : t('accounting.newEntry')}
          </button>
        </div>
      </div>

      {activeTab === 'ledger' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {showForm ? t('accounting.cancel') : t('accounting.newEntry')}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('accounting.date')}
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('accounting.account')}
                  </label>
                  <input
                    type="text"
                    value={formData.account}
                    onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('accounting.description')}
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('accounting.debit')}
                  </label>
                  <input
                    type="number"
                    value={formData.debit}
                    onChange={(e) => setFormData({ ...formData, debit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('accounting.credit')}
                  </label>
                  <input
                    type="number"
                    value={formData.credit}
                    onChange={(e) => setFormData({ ...formData, credit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                {t('accounting.saveEntry')}
              </button>
            </form>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('accounting.date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('accounting.account')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('accounting.description')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('accounting.debit')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('accounting.credit')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ledgerEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.account}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.debit.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.credit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'journal' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('accounting.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('accounting.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('accounting.entries')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {journalEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{entry.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{entry.description}</td>
                  <td className="px-6 py-4">
                    <table className="min-w-full">
                      <tbody>
                        {entry.entries.map((e, index) => (
                          <tr key={index}>
                            <td className="px-2 py-1">{e.account}</td>
                            <td className="px-2 py-1">{e.debit.toFixed(2)}</td>
                            <td className="px-2 py-1">{e.credit.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">{t('accounting.trialBalance')}</h2>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">{t('accounting.account')}</th>
                  <th className="px-4 py-2">{t('accounting.debit')}</th>
                  <th className="px-4 py-2">{t('accounting.credit')}</th>
                </tr>
              </thead>
              <tbody>
                {/* Add trial balance data here */}
              </tbody>
            </table>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">{t('accounting.profitAndLoss')}</h2>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">{t('accounting.description')}</th>
                  <th className="px-4 py-2">{t('accounting.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {/* Add profit and loss data here */}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting; 