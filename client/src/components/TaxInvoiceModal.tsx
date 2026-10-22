import React, { useRef } from 'react';
import { X, Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { Order } from '../types';
import { parseOrderNotes } from '../utils/validation';

interface TaxInvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

// Convert numbers into Indian English Words (Lakhs, Crores, Thousands)
function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const roundNum = Math.floor(Math.abs(num));
  const n = ('000000000' + roundNum).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return `${roundNum} Rupees Only`;

  let str = '';
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || `${b[Number(n[1][0])]} ${a[Number(n[1][1])]}`) + 'Crore ' : '';
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || `${b[Number(n[2][0])]} ${a[Number(n[2][1])]}`) + 'Lakh ' : '';
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || `${b[Number(n[3][0])]} ${a[Number(n[3][1])]}`) + 'Thousand ' : '';
  str += Number(n[4]) !== 0 ? (a[Number(n[4])] || `${b[Number(n[4][0])]} ${a[Number(n[4][1])]}`) + 'Hundred ' : '';
  str += Number(n[5]) !== 0 ? (str !== '' ? 'and ' : '') + (a[Number(n[5])] || `${b[Number(n[5][0])]} ${a[Number(n[5][1])]}`) : '';

  return str.trim() ? `Rupees ${str.trim()} Only` : 'Zero Rupees Only';
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({ order, isOpen, onClose }) => {
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const parsedNotes = parseOrderNotes(order.notes);

  const invoiceNumber = `INV-${order.orderNumber.replace(/^EC-/, '')}`;
  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const isInterstate = (order.shippingState || '').toLowerCase() !== 'haryana';
  const taxRatePercent = 12; // 12% standard luxury haute couture rate
  const taxableValue = Math.round((order.subtotal / (1 + taxRatePercent / 100)) * 100) / 100;
  const totalTax = Math.round((order.subtotal - taxableValue) * 100) / 100;
  const igst = isInterstate ? totalTax : 0;
  const cgst = !isInterstate ? Math.round((totalTax / 2) * 100) / 100 : 0;
  const sgst = !isInterstate ? Math.round((totalTax / 2) * 100) / 100 : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Background overlay click */}
      <div className="fixed inset-0 print:hidden" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white rounded-t-[28px] sm:rounded-xl shadow-2xl overflow-hidden my-0 sm:my-auto border-t sm:border border-[#E8DEC8] max-h-[92vh] sm:max-h-none overflow-y-auto print:border-none print:shadow-none print:w-full print:max-w-none print:m-0 print:rounded-none">
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto mt-3 sm:hidden print:hidden" />

        {/* Top Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-[#3E1A1E] text-white border-b border-[#C6A15D]/40 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C6A15D]/20 flex items-center justify-center border border-[#C6A15D]/40">
              <FileText className="w-4 h-4 text-[#DFC89D]" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold tracking-wider uppercase text-white">
                Official Tax Invoice
              </h3>
              <p className="text-[11px] text-[#DFC89D] font-mono">
                {invoiceNumber} &bull; GST Compliant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#C6A15D] hover:bg-[#84642C] text-zinc-900 hover:text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Close Invoice"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div
          ref={printContentRef}
          id="printable-tax-invoice"
          className="p-6 sm:p-10 font-sans text-zinc-900 bg-white print:p-8"
        >
          {/* Header & Seller Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-[#3E1A1E] gap-6">
            <div>
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-[0.18em] uppercase text-[#3E1A1E]">
                ETHNIZ<span className="italic font-light text-[#84642C] lowercase">Couture</span>
              </span>
              <p className="text-[10px] tracking-[0.25em] font-bold uppercase text-[#84642C] mt-1">
                Wear Your Heritage. Own Your Style.
              </p>
              <div className="mt-3 text-xs text-zinc-600 space-y-0.5 leading-relaxed">
                <p className="font-bold text-zinc-900">Ethniz Couture Luxury Apparels Pvt. Ltd.</p>
                <p>Atelier No. 14, Heritage Lane, DLF Phase 2</p>
                <p>Gurugram, Haryana &mdash; 122002, India</p>
                <p>
                  <strong>GSTIN:</strong> 06AAECE1234F1Z8 &bull; <strong>State Code:</strong> 06 (Haryana)
                </p>
                <p>
                  <strong>Email:</strong> atelier@ethnizcouture.com &bull; <strong>Phone:</strong> +91 98200 12345
                </p>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-zinc-200 w-full sm:w-auto">
              <span className="inline-block px-3 py-1 bg-[#3E1A1E] text-white text-[11px] font-bold tracking-widest uppercase rounded">
                TAX INVOICE
              </span>
              <div className="mt-3 text-xs text-zinc-700 space-y-1">
                <p>
                  <span className="text-zinc-500">Invoice No:</span>{' '}
                  <strong className="font-mono text-zinc-900">{invoiceNumber}</strong>
                </p>
                <p>
                  <span className="text-zinc-500">Invoice Date:</span>{' '}
                  <strong className="text-zinc-900">{invoiceDate}</strong>
                </p>
                <p>
                  <span className="text-zinc-500">Order ID:</span>{' '}
                  <strong className="font-mono text-zinc-900">{order.orderNumber}</strong>
                </p>
                <p>
                  <span className="text-zinc-500">Payment Method:</span>{' '}
                  <strong className="text-zinc-900 uppercase">
                    {order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}
                  </strong>
                </p>
                <p>
                  <span className="text-zinc-500">Payment Status:</span>{' '}
                  <strong className={order.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}>
                    {order.paymentStatus}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-zinc-200 text-xs">
            <div className="bg-[#FAF7F2] p-4 rounded-lg border border-[#E8DEC8]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#84642C] block mb-2">
                Billed To (Customer Details)
              </span>
              <p className="font-bold text-sm text-zinc-950 mb-0.5">
                {parsedNotes.businessName ? parsedNotes.businessName : order.customerName}
              </p>
              {parsedNotes.businessName && (
                <p className="text-zinc-600 text-[11px] mb-1">
                  <span className="text-zinc-500">Representative:</span> {order.customerName}
                </p>
              )}
              {parsedNotes.billingAddress ? (
                <p className="text-zinc-600 leading-relaxed">
                  {parsedNotes.billingAddress.fullAddress}
                </p>
              ) : (
                <p className="text-zinc-600 leading-relaxed">
                  {order.shippingStreet}
                  {order.shippingApartment ? `, ${order.shippingApartment}` : ''}
                  <br />
                  {order.shippingCity}, {order.shippingState} &mdash; <strong>{order.shippingPincode}</strong>
                  <br />
                  {order.shippingCountry || 'India'}
                </p>
              )}
              <p className="text-zinc-600 mt-1">
                {order.customerEmail}
                <br />
                Phone: {order.customerPhone}
              </p>
              {parsedNotes.gstin && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded border border-[#C6A15D]/60 text-zinc-900 font-mono text-[11px] font-bold">
                  <span className="text-[#84642C]">GSTIN / UIN:</span>
                  <span>{parsedNotes.gstin}</span>
                </div>
              )}
              <p className="text-zinc-600 mt-1.5">
                <strong>Place of Supply:</strong> {order.shippingState}, India
              </p>
            </div>

            <div className="bg-[#FAF7F2] p-4 rounded-lg border border-[#E8DEC8]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#84642C] block mb-2">
                Shipped To (Consignee Destination)
              </span>
              <p className="font-bold text-sm text-zinc-950 mb-1">{order.customerName}</p>
              <p className="text-zinc-600 leading-relaxed">
                {order.shippingStreet}
                {order.shippingApartment ? `, ${order.shippingApartment}` : ''}
                <br />
                {order.shippingCity}, {order.shippingState} &mdash; <strong>{order.shippingPincode}</strong>
                <br />
                {order.shippingCountry || 'India'}
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-6 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-900 bg-zinc-50">
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-zinc-700 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-zinc-700">Garment Description</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-zinc-700 w-20 text-center">HSN Code</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-zinc-700 w-16 text-center">Qty</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-zinc-700 w-28 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-zinc-700 w-28 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {order.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="py-3 px-3 text-center text-zinc-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-zinc-900">{item.productName}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {item.size ? `Size: ${item.size}` : ''}
                        {item.color ? ` &bull; Color: ${item.color}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-center text-zinc-600 font-mono">6204</td>
                    <td className="py-3 px-3 text-center font-bold text-zinc-900">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-700">
                      ₹{item.price.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-zinc-950">
                      ₹{item.total.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Calculation Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t-2 border-zinc-900 text-xs">
            <div className="max-w-md space-y-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                  Amount Chargeable (in Words)
                </span>
                <p className="font-serif italic font-bold text-zinc-800 text-sm mt-0.5">
                  {numberToIndianWords(order.totalAmount)}
                </p>
              </div>

              <div className="pt-2 text-[11px] text-zinc-500 space-y-1">
                <p>
                  <strong>Tax Breakup (Included in Price):</strong>
                </p>
                <p>
                  Taxable Value: ₹{taxableValue.toLocaleString('en-IN')} &bull; GST ({taxRatePercent}%): ₹{totalTax.toLocaleString('en-IN')}
                </p>
                {isInterstate ? (
                  <p>IGST (12%): ₹{igst.toLocaleString('en-IN')}</p>
                ) : (
                  <p>
                    CGST (6%): ₹{cgst.toLocaleString('en-IN')} &bull; SGST (6%): ₹{sgst.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-right">
              <div className="flex justify-between py-1 text-zinc-600">
                <span>Subtotal:</span>
                <span className="font-mono">₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between py-1 text-emerald-700">
                  <span>Coupon Discount {order.couponCode ? `(${order.couponCode})` : ''}:</span>
                  <span className="font-mono">-₹{order.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between py-1 text-zinc-600">
                <span>Insured Express Shipping:</span>
                <span className="font-mono">
                  {order.shippingFee > 0 ? `₹${order.shippingFee.toLocaleString('en-IN')}` : 'Complimentary'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-[#3E1A1E] font-serif text-base font-bold text-[#3E1A1E]">
                <span>Total Amount:</span>
                <span className="font-mono text-lg">₹{order.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer, Terms & Authorized Signatory */}
          <div className="mt-8 pt-6 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-[10px] text-zinc-500">
            <div className="max-w-md space-y-1">
              <p className="font-bold text-zinc-700 uppercase tracking-wider">Terms &amp; Conditions:</p>
              <p>1. Returns / size exchanges accepted within 7 days of delivery with security tag intact.</p>
              <p>2. Bespoke stitched or custom hemmed garments are tailored exclusively and non-refundable.</p>
              <p>3. This is a computer-generated tax invoice generated under the Indian CGST/IGST Act, 2017.</p>
            </div>

            <div className="text-center sm:text-right space-y-2">
              <div className="inline-block p-2 border border-[#C6A15D]/60 rounded-md bg-[#FAF7F2] text-center mb-1">
                <span className="font-serif text-xs font-bold text-[#3E1A1E] tracking-wider block">
                  ETHNIZ COUTURE
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#84642C] block">
                  ATELIER VERIFIED
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mx-auto mt-0.5" />
              </div>
              <p className="font-bold text-zinc-800 text-[11px]">For Ethniz Couture Luxury Apparels Pvt. Ltd.</p>
              <p className="italic text-zinc-500">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
