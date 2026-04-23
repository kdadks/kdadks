# Rate Card Integration Example

## Integrating Rate Cards into Quote Creation

This document shows how to integrate the `QuoteRateCardSelector` component into your existing quote creation workflow.

## Quick Integration

### Option 1: Add to Existing Quote Form

If you have an existing quote creation form (like `QuoteForm.tsx` or `CreateQuote.tsx`), add the rate card selector:

```tsx
import React, { useState } from 'react';
import QuoteRateCardSelector from './QuoteRateCardSelector';
import type { QuoteRateCard } from '../../types/rateCard';

const QuoteForm: React.FC = () => {
  const [selectedRateCards, setSelectedRateCards] = useState<QuoteRateCard[]>([]);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

  // Your existing quote form state
  const [quoteData, setQuoteData] = useState({
    customer_id: '',
    quote_date: '',
    // ... other fields
  });

  const handleSubmit = async () => {
    // Calculate totals from rate cards
    const rateCardTotalUSD = selectedRateCards.reduce(
      (sum, rc) => sum + rc.subtotal_usd,
      0
    );
    const rateCardTotalINR = selectedRateCards.reduce(
      (sum, rc) => sum + rc.subtotal_inr,
      0
    );

    // Include rate cards in quote submission
    const quotePayload = {
      ...quoteData,
      currency_code: currency,
      // You can add rate card totals to quote items or as separate line items
      subtotal: currency === 'USD' ? rateCardTotalUSD : rateCardTotalINR,
      // ... other calculations
    };

    // Submit quote
    // await quoteService.createQuote(quotePayload);

    // Save rate cards to quote
    // for (const rateCard of selectedRateCards) {
    //   await rateCardService.createQuoteRateCard({
    //     ...rateCard,
    //     quote_id: newQuote.id
    //   });
    // }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your existing quote form fields */}

      {/* Add Rate Card Selector */}
      <div className="mb-6">
        <QuoteRateCardSelector
          currency={currency}
          onRateCardsChange={setSelectedRateCards}
        />
      </div>

      {/* Rest of your form */}
      <button type="submit">Create Quote</button>
    </form>
  );
};
```

### Option 2: Add as a Separate Tab in Quote Management

```tsx
import React, { useState } from 'react';
import QuoteRateCardSelector from './QuoteRateCardSelector';

const QuoteManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'resources'>('details');
  const [selectedQuote, setSelectedQuote] = useState(null);

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={activeTab === 'details' ? 'active-tab' : 'inactive-tab'}
          >
            Quote Details
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={activeTab === 'items' ? 'active-tab' : 'inactive-tab'}
          >
            Line Items
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={activeTab === 'resources' ? 'active-tab' : 'inactive-tab'}
          >
            Resources & Rate Cards
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && <QuoteDetailsForm />}
      {activeTab === 'items' && <QuoteItemsForm />}
      {activeTab === 'resources' && (
        <QuoteRateCardSelector
          quoteId={selectedQuote?.id}
          currency={selectedQuote?.currency_code || 'USD'}
        />
      )}
    </div>
  );
};
```

## Complete Example: Enhanced Quote Form

Here's a complete example showing how to create a quote with rate cards:

```tsx
import React, { useState, useEffect } from 'react';
import QuoteRateCardSelector from './QuoteRateCardSelector';
import { quoteService } from '../../services/quoteService';
import { rateCardService } from '../../services/rateCardService';
import type { QuoteRateCard } from '../../types/rateCard';

const CreateQuoteWithRateCards: React.FC = () => {
  const [step, setStep] = useState<'details' | 'resources' | 'review'>(1);
  const [rateCards, setRateCards] = useState<QuoteRateCard[]>([]);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

  const [quoteForm, setQuoteForm] = useState({
    customer_id: '',
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    project_title: '',
    estimated_time: '',
    notes: '',
  });

  const calculateTotals = () => {
    const subtotalUSD = rateCards.reduce((sum, rc) => sum + rc.subtotal_usd, 0);
    const subtotalINR = rateCards.reduce((sum, rc) => sum + rc.subtotal_inr, 0);

    const tax = 0.18; // 18% GST
    const taxAmountUSD = subtotalUSD * tax;
    const taxAmountINR = subtotalINR * tax;

    return {
      subtotalUSD,
      subtotalINR,
      taxAmountUSD,
      taxAmountINR,
      totalUSD: subtotalUSD + taxAmountUSD,
      totalINR: subtotalINR + taxAmountINR,
    };
  };

  const handleSubmitQuote = async () => {
    try {
      const totals = calculateTotals();

      // Create the quote
      const quote = await quoteService.createQuote({
        ...quoteForm,
        currency_code: currency,
        subtotal: currency === 'USD' ? totals.subtotalUSD : totals.subtotalINR,
        tax_amount: currency === 'USD' ? totals.taxAmountUSD : totals.taxAmountINR,
        total_amount: currency === 'USD' ? totals.totalUSD : totals.totalINR,
        items: [], // You might want to convert rate cards to quote items
      });

      // Save rate cards
      for (const rateCard of rateCards) {
        await rateCardService.createQuoteRateCard({
          ...rateCard,
          quote_id: quote.id,
        });
      }

      alert('Quote created successfully!');
      // Redirect or reset form
    } catch (error) {
      console.error('Failed to create quote:', error);
      alert('Failed to create quote');
    }
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Consulting Engagement Quote</h1>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex-1 ${step === 'details' ? 'font-bold' : ''}`}>
            1. Quote Details
          </div>
          <div className={`flex-1 ${step === 'resources' ? 'font-bold' : ''}`}>
            2. Resources
          </div>
          <div className={`flex-1 ${step === 'review' ? 'font-bold' : ''}`}>
            3. Review
          </div>
        </div>
      </div>

      {/* Step 1: Quote Details */}
      {step === 'details' && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Quote Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer *</label>
              <select
                value={quoteForm.customer_id}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, customer_id: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select Customer</option>
                {/* Load customers */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Currency *</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'USD' | 'INR')}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quote Date *</label>
              <input
                type="date"
                value={quoteForm.quote_date}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, quote_date: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Valid Until</label>
              <input
                type="date"
                value={quoteForm.valid_until}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, valid_until: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Project Title</label>
              <input
                type="text"
                value={quoteForm.project_title}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, project_title: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                placeholder="e.g., AI-Powered Analytics Dashboard"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Estimated Time</label>
              <input
                type="text"
                value={quoteForm.estimated_time}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, estimated_time: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                placeholder="e.g., 3-4 months"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep('resources')}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Next: Add Resources
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Resources */}
      {step === 'resources' && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Add Resources</h2>

          <QuoteRateCardSelector
            currency={currency}
            onRateCardsChange={setRateCards}
          />

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep('details')}
              className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep('review')}
              disabled={rateCards.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Review Quote</h2>

          {/* Quote Summary */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Quote Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Customer: {quoteForm.customer_id}</div>
              <div>Currency: {currency}</div>
              <div>Quote Date: {quoteForm.quote_date}</div>
              <div>Valid Until: {quoteForm.valid_until}</div>
              <div className="col-span-2">Project: {quoteForm.project_title}</div>
            </div>
          </div>

          {/* Resources Summary */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Resources</h3>
            <div className="space-y-2">
              {rateCards.map((rc, index) => (
                <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                  <span>
                    {rc.category} - {rc.resource_level} ({rc.quantity} {rc.unit}s)
                  </span>
                  <span className="font-medium">
                    {currency === 'USD'
                      ? `$${rc.subtotal_usd.toFixed(2)}`
                      : `₹${rc.subtotal_inr.toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">
                {currency === 'USD'
                  ? `$${totals.subtotalUSD.toFixed(2)}`
                  : `₹${totals.subtotalINR.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tax (18%):</span>
              <span className="font-medium">
                {currency === 'USD'
                  ? `$${totals.taxAmountUSD.toFixed(2)}`
                  : `₹${totals.taxAmountINR.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-green-600">
                {currency === 'USD'
                  ? `$${totals.totalUSD.toFixed(2)}`
                  : `₹${totals.totalINR.toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep('resources')}
              className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleSubmitQuote}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Create Quote
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateQuoteWithRateCards;
```

## Converting Rate Cards to Quote Items

If you want to add rate cards as regular quote items:

```tsx
const convertRateCardsToQuoteItems = (rateCards: QuoteRateCard[], currency: 'USD' | 'INR') => {
  return rateCards.map((rc) => ({
    item_name: `${rc.category} - ${rc.resource_level}`,
    description: `${rc.quantity} ${rc.unit}(s) @ ${
      currency === 'USD'
        ? `$${rc.rate_usd.toFixed(2)}`
        : `₹${rc.rate_inr.toFixed(2)}`
    }/${rc.unit}${rc.notes ? `\n\nNotes: ${rc.notes}` : ''}`,
    quantity: rc.quantity,
    unit: rc.unit,
    unit_price: currency === 'USD' ? rc.rate_usd : rc.rate_inr,
    line_total: currency === 'USD' ? rc.subtotal_usd : rc.subtotal_inr,
    tax_rate: 18.00,
  }));
};

// Usage:
const quoteItems = convertRateCardsToQuoteItems(selectedRateCards, currency);
```

## Summary

The rate card system is now fully integrated and ready to use. You can:

1. **Manage Templates**: Create and manage rate card templates via Admin Dashboard
2. **Add to Quotes**: Use the `QuoteRateCardSelector` component in quote forms
3. **Customize Rates**: Allow customization of rates per customer/quote
4. **Calculate Totals**: Automatic calculation of costs in both currencies

For more details, see `RATE_CARD_IMPLEMENTATION.md`.
