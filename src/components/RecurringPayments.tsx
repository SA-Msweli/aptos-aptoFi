"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import {
  SUPPORTED_CHAINS,
  type SupportedChainName,
  getChainName,
  estimateCrossChainFee,
  validateCrossChainTransfer
} from "@/entry-functions/ccipBridge";
import {
  estimateCrossChainFee as estimateFeeView,
  type SupportedChain
} from "@/view-functions/getCCIPData";

interface RecurringPayment {
  id: string;
  recipient: string;
  token: string;
  amount: number;
  destinationChain: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  customInterval?: number; // in days for custom frequency
  nextPayment: Date;
  isActive: boolean;
  createdAt: Date;
  lastPayment?: Date;
  totalPayments: number;
  failedPayments: number;
  template?: PaymentTemplate;
}

interface PaymentTemplate {
  id: string;
  name: string;
  recipient: string;
  token: string;
  amount: number;
  destinationChain: number;
  description?: string;
  createdAt: Date;
}

interface RecipientContact {
  id: string;
  name: string;
  address: string;
  preferredChain: number;
  notes?: string;
  createdAt: Date;
}

interface RecurringPaymentsProps {
  onNavigate?: (section: string) => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', icon: '📅' },
  { value: 'weekly', label: 'Weekly', icon: '📆' },
  { value: 'monthly', label: 'Monthly', icon: '🗓️' },
  { value: 'custom', label: 'Custom', icon: '⚙️' }
] as const;

const CHAIN_ICONS: Record<SupportedChainName, string> = {
  ETHEREUM: '🔷',
  POLYGON: '🟣',
  AVALANCHE: '🔺',
  ARBITRUM: '🔵',
  OPTIMISM: '🔴',
  BASE: '🔵'
};

export function RecurringPayments({ onNavigate }: RecurringPaymentsProps) {
  const { connected, account } = useWallet();
  const { hasProfile, isActive } = useProfileStatus();

  // State management
  const [activeTab, setActiveTab] = useState<'schedule' | 'templates' | 'contacts'>('schedule');
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [paymentTemplates, setPaymentTemplates] = useState<PaymentTemplate[]>([]);
  const [recipientContacts, setRecipientContacts] = useState<RecipientContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  // Schedule form
  const [scheduleForm, setScheduleForm] = useState({
    recipient: '',
    token: 'APT',
    amount: '',
    destinationChain: SUPPORTED_CHAINS.ETHEREUM,
    frequency: 'monthly' as const,
    customInterval: 30,
    startDate: new Date().toISOString().split('T')[0],
    templateId: '',
    contactId: ''
  });

  // Template form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    recipient: '',
    token: 'APT',
    amount: '',
    destinationChain: SUPPORTED_CHAINS.ETHEREUM,
    description: ''
  });

  // Contact form
  const [contactForm, setContactForm] = useState({
    name: '',
    address: '',
    preferredChain: SUPPORTED_CHAINS.ETHEREUM,
    notes: ''
  });

  // Load data from localStorage (in a real app, this would be from a backend)
  useEffect(() => {
    if (!connected || !account?.address) return;

    const loadStoredData = () => {
      try {
        const userKey = account.address.toString();

        const storedPayments = localStorage.getItem(`recurringPayments_${userKey}`);
        if (storedPayments) {
          const payments = JSON.parse(storedPayments).map((p: any) => ({
            ...p,
            nextPayment: new Date(p.nextPayment),
            createdAt: new Date(p.createdAt),
            lastPayment: p.lastPayment ? new Date(p.lastPayment) : undefined
          }));
          setRecurringPayments(payments);
        }

        const storedTemplates = localStorage.getItem(`paymentTemplates_${userKey}`);
        if (storedTemplates) {
          const templates = JSON.parse(storedTemplates).map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt)
          }));
          setPaymentTemplates(templates);
        }

        const storedContacts = localStorage.getItem(`recipientContacts_${userKey}`);
        if (storedContacts) {
          const contacts = JSON.parse(storedContacts).map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt)
          }));
          setRecipientContacts(contacts);
        }
      } catch (err) {
        console.error('Error loading stored data:', err);
      }
    };

    loadStoredData();
  }, [connected, account]);

  // Save data to localStorage
  const saveData = (type: 'payments' | 'templates' | 'contacts', data: any[]) => {
    if (!account?.address) return;

    const userKey = account.address.toString();
    const storageKey = type === 'payments' ? `recurringPayments_${userKey}` :
      type === 'templates' ? `paymentTemplates_${userKey}` :
        `recipientContacts_${userKey}`;

    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  const calculateNextPayment = (frequency: string, customInterval?: number, startDate?: Date): Date => {
    const start = startDate || new Date();
    const next = new Date(start);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'custom':
        next.setDate(next.getDate() + (customInterval || 30));
        break;
    }

    return next;
  };

  const handleScheduleSubmit = async () => {
    if (!connected || !account?.address) {
      setError('Please connect your wallet');
      return;
    }

    if (!hasProfile || !isActive) {
      setError('Please create and activate your DID profile first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!scheduleForm.recipient || !scheduleForm.amount) {
        setError('Recipient and amount are required');
        return;
      }

      const amount = parseFloat(scheduleForm.amount);
      if (amount <= 0) {
        setError('Amount must be greater than 0');
        return;
      }

      // Validate transfer parameters
      const transferArgs = {
        recipient: scheduleForm.recipient,
        token: scheduleForm.token,
        amount: amount * 100000000, // Convert to octas
        destinationChain: scheduleForm.destinationChain,
        gasLimit: 200000
      };

      const validation = validateCrossChainTransfer(transferArgs);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      // Create recurring payment
      const newPayment: RecurringPayment = {
        id: `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recipient: scheduleForm.recipient,
        token: scheduleForm.token,
        amount: amount * 100000000,
        destinationChain: scheduleForm.destinationChain,
        frequency: scheduleForm.frequency,
        customInterval: scheduleForm.frequency === 'custom' ? scheduleForm.customInterval : undefined,
        nextPayment: calculateNextPayment(
          scheduleForm.frequency,
          scheduleForm.customInterval,
          new Date(scheduleForm.startDate)
        ),
        isActive: true,
        createdAt: new Date(),
        totalPayments: 0,
        failedPayments: 0,
        template: scheduleForm.templateId ? paymentTemplates.find(t => t.id === scheduleForm.templateId) : undefined
      };

      const updatedPayments = [...recurringPayments, newPayment];
      setRecurringPayments(updatedPayments);
      saveData('payments', updatedPayments);

      // Reset form
      setScheduleForm({
        recipient: '',
        token: 'APT',
        amount: '',
        destinationChain: SUPPORTED_CHAINS.ETHEREUM,
        frequency: 'monthly',
        customInterval: 30,
        startDate: new Date().toISOString().split('T')[0],
        templateId: '',
        contactId: ''
      });
      setShowScheduleForm(false);
    } catch (err: any) {
      console.error('Error creating recurring payment:', err);
      setError(err.message || 'Failed to create recurring payment');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSubmit = async () => {
    if (!templateForm.name || !templateForm.recipient || !templateForm.amount) {
      setError('Name, recipient, and amount are required');
      return;
    }

    const newTemplate: PaymentTemplate = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: templateForm.name,
      recipient: templateForm.recipient,
      token: templateForm.token,
      amount: parseFloat(templateForm.amount) * 100000000,
      destinationChain: templateForm.destinationChain,
      description: templateForm.description,
      createdAt: new Date()
    };

    const updatedTemplates = [...paymentTemplates, newTemplate];
    setPaymentTemplates(updatedTemplates);
    saveData('templates', updatedTemplates);

    // Reset form
    setTemplateForm({
      name: '',
      recipient: '',
      token: 'APT',
      amount: '',
      destinationChain: SUPPORTED_CHAINS.ETHEREUM,
      description: ''
    });
    setShowTemplateForm(false);
  };

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.address) {
      setError('Name and address are required');
      return;
    }

    const newContact: RecipientContact = {
      id: `rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: contactForm.name,
      address: contactForm.address,
      preferredChain: contactForm.preferredChain,
      notes: contactForm.notes,
      createdAt: new Date()
    };

    const updatedContacts = [...recipientContacts, newContact];
    setRecipientContacts(updatedContacts);
    saveData('contacts', updatedContacts);

    // Reset form
    setContactForm({
      name: '',
      address: '',
      preferredChain: SUPPORTED_CHAINS.ETHEREUM,
      notes: ''
    });
    setShowContactForm(false);
  };

  const togglePaymentStatus = (paymentId: string) => {
    const updatedPayments = recurringPayments.map(payment =>
      payment.id === paymentId
        ? { ...payment, isActive: !payment.isActive }
        : payment
    );
    setRecurringPayments(updatedPayments);
    saveData('payments', updatedPayments);
  };

  const deletePayment = (paymentId: string) => {
    const updatedPayments = recurringPayments.filter(p => p.id !== paymentId);
    setRecurringPayments(updatedPayments);
    saveData('payments', updatedPayments);
  };

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = paymentTemplates.filter(t => t.id !== templateId);
    setPaymentTemplates(updatedTemplates);
    saveData('templates', updatedTemplates);
  };

  const deleteContact = (contactId: string) => {
    const updatedContacts = recipientContacts.filter(c => c.id !== contactId);
    setRecipientContacts(updatedContacts);
    saveData('contacts', updatedContacts);
  };

  const useTemplate = (template: PaymentTemplate) => {
    setScheduleForm(prev => ({
      ...prev,
      recipient: template.recipient,
      token: template.token,
      amount: (template.amount / 100000000).toString(),
      destinationChain: template.destinationChain,
      templateId: template.id
    }));
    setActiveTab('schedule');
    setShowScheduleForm(true);
  };

  const useContact = (contact: RecipientContact) => {
    setScheduleForm(prev => ({
      ...prev,
      recipient: contact.address,
      destinationChain: contact.preferredChain,
      contactId: contact.id
    }));
    setActiveTab('schedule');
    setShowScheduleForm(true);
  };

  const getChainDisplay = (chainSelector: number) => {
    const chainName = getChainName(chainSelector);
    if (!chainName) return { name: `Chain-${chainSelector}`, icon: '🔗' };

    return {
      name: chainName,
      icon: CHAIN_ICONS[chainName]
    };
  };

  const formatAmount = (amount: number, token: string) => {
    return `${(amount / 100000000).toFixed(4)} ${token}`;
  };

  const getFrequencyDisplay = (payment: RecurringPayment) => {
    if (payment.frequency === 'custom') {
      return `Every ${payment.customInterval} days`;
    }
    return payment.frequency.charAt(0).toUpperCase() + payment.frequency.slice(1);
  };

  if (!connected) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-gray-400 text-2xl">🔄</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">Connect your wallet to set up recurring payments</p>
      </div>
    );
  }

  if (!hasProfile || !isActive) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-yellow-600 text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">DID Profile Required</h3>
        <p className="text-gray-600 mb-4">Create and activate your DID profile to set up recurring payments</p>
        <button
          onClick={() => onNavigate?.('profile')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recurring Payments</h1>
        <p className="text-gray-600">Set up automated cross-chain payments with flexible scheduling</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'schedule', label: 'Scheduled Payments', icon: '🔄' },
          { key: 'templates', label: 'Templates', icon: '📋' },
          { key: 'contacts', label: 'Address Book', icon: '👥' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Scheduled Payments Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Add New Payment Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Scheduled Payments</h3>
            <button
              onClick={() => setShowScheduleForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Schedule Payment</span>
            </button>
          </div>

          {/* Schedule Form Modal */}
          {showScheduleForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">Schedule Recurring Payment</h4>
                    <button
                      onClick={() => setShowScheduleForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Template Selection */}
                  {paymentTemplates.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Use Template (Optional)
                      </label>
                      <select
                        value={scheduleForm.templateId}
                        onChange={(e) => {
                          const template = paymentTemplates.find(t => t.id === e.target.value);
                          if (template) {
                            useTemplate(template);
                          } else {
                            setScheduleForm(prev => ({ ...prev, templateId: '' }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a template...</option>
                        {paymentTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Contact Selection */}
                  {recipientContacts.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Use Contact (Optional)
                      </label>
                      <select
                        value={scheduleForm.contactId}
                        onChange={(e) => {
                          const contact = recipientContacts.find(c => c.id === e.target.value);
                          if (contact) {
                            useContact(contact);
                          } else {
                            setScheduleForm(prev => ({ ...prev, contactId: '' }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a contact...</option>
                        {recipientContacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.name} ({getChainDisplay(contact.preferredChain).name})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Recipient */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={scheduleForm.recipient}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, recipient: e.target.value }))}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Destination Chain */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination Chain
                    </label>
                    <select
                      value={scheduleForm.destinationChain}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, destinationChain: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(SUPPORTED_CHAINS).map(([name, selector]) => {
                        const display = getChainDisplay(selector);
                        return (
                          <option key={name} value={selector}>
                            {display.icon} {display.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Token and Amount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token
                      </label>
                      <select
                        value={scheduleForm.token}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, token: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="APT">APT</option>
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={scheduleForm.amount}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={scheduleForm.frequency}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, frequency: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {FREQUENCY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Interval */}
                  {scheduleForm.frequency === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Interval (Days)
                      </label>
                      <input
                        type="number"
                        value={scheduleForm.customInterval}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, customInterval: parseInt(e.target.value) }))}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={scheduleForm.startDate}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, startDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleScheduleSubmit}
                    disabled={loading || !scheduleForm.recipient || !scheduleForm.amount}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Schedule Payment</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payments List */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6">
              {recurringPayments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-gray-400 text-xl">🔄</span>
                  </div>
                  <p className="text-gray-500 text-sm">No recurring payments scheduled</p>
                  <p className="text-gray-400 text-xs mt-1">Set up automated payments to save time</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recurringPayments.map((payment) => {
                    const chainDisplay = getChainDisplay(payment.destinationChain);
                    const isOverdue = payment.nextPayment < new Date() && payment.isActive;

                    return (
                      <div key={payment.id} className={`p-4 border rounded-lg ${isOverdue ? 'border-red-300 bg-red-50' :
                          payment.isActive ? 'border-green-300 bg-green-50' :
                            'border-gray-300 bg-gray-50'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${isOverdue ? 'bg-red-500' :
                                payment.isActive ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatAmount(payment.amount, payment.token)} to {chainDisplay.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {getFrequencyDisplay(payment)} • Next: {payment.nextPayment.toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {payment.totalPayments} sent, {payment.failedPayments} failed
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => togglePaymentStatus(payment.id)}
                              className={`px-3 py-1 rounded text-xs font-medium ${payment.isActive
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                            >
                              {payment.isActive ? 'Pause' : 'Resume'}
                            </button>
                            <button
                              onClick={() => deletePayment(payment.id)}
                              className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {isOverdue && (
                          <div className="mt-2 text-xs text-red-600">
                            ⚠️ Payment overdue - will be processed on next execution cycle
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Payment Templates</h3>
            <button
              onClick={() => setShowTemplateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Create Template</span>
            </button>
          </div>

          {/* Template Form Modal */}
          {showTemplateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">Create Payment Template</h4>
                    <button
                      onClick={() => setShowTemplateForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Monthly Rent"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={templateForm.recipient}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, recipient: e.target.value }))}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination Chain
                    </label>
                    <select
                      value={templateForm.destinationChain}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, destinationChain: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(SUPPORTED_CHAINS).map(([name, selector]) => {
                        const display = getChainDisplay(selector);
                        return (
                          <option key={name} value={selector}>
                            {display.icon} {display.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token
                      </label>
                      <select
                        value={templateForm.token}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, token: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="APT">APT</option>
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={templateForm.amount}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Template description..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleTemplateSubmit}
                    disabled={!templateForm.name || !templateForm.recipient || !templateForm.amount}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Templates List */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6">
              {paymentTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-gray-400 text-xl">📋</span>
                  </div>
                  <p className="text-gray-500 text-sm">No payment templates</p>
                  <p className="text-gray-400 text-xs mt-1">Create templates for frequently used payments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentTemplates.map((template) => {
                    const chainDisplay = getChainDisplay(template.destinationChain);

                    return (
                      <div key={template.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{template.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatAmount(template.amount, template.token)} to {chainDisplay.name}
                            </p>
                            {template.description && (
                              <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => useTemplate(template)}
                              className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                            >
                              Use
                            </button>
                            <button
                              onClick={() => deleteTemplate(template.id)}
                              className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Address Book</h3>
            <button
              onClick={() => setShowContactForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Add Contact</span>
            </button>
          </div>

          {/* Contact Form Modal */}
          {showContactForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">Add Contact</h4>
                    <button
                      onClick={() => setShowContactForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      value={contactForm.address}
                      onChange={(e) => setContactForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Chain
                    </label>
                    <select
                      value={contactForm.preferredChain}
                      onChange={(e) => setContactForm(prev => ({ ...prev, preferredChain: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(SUPPORTED_CHAINS).map(([name, selector]) => {
                        const display = getChainDisplay(selector);
                        return (
                          <option key={name} value={selector}>
                            {display.icon} {display.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={contactForm.notes}
                      onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleContactSubmit}
                    disabled={!contactForm.name || !contactForm.address}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Contact
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contacts List */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6">
              {recipientContacts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-gray-400 text-xl">👥</span>
                  </div>
                  <p className="text-gray-500 text-sm">No contacts saved</p>
                  <p className="text-gray-400 text-xs mt-1">Add frequently used addresses for quick access</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recipientContacts.map((contact) => {
                    const chainDisplay = getChainDisplay(contact.preferredChain);

                    return (
                      <div key={contact.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{contact.address}</p>
                            <p className="text-xs text-gray-500">
                              Preferred: {chainDisplay.icon} {chainDisplay.name}
                            </p>
                            {contact.notes && (
                              <p className="text-xs text-gray-400 mt-1">{contact.notes}</p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => useContact(contact)}
                              className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                            >
                              Use
                            </button>
                            <button
                              onClick={() => deleteContact(contact.id)}
                              className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}