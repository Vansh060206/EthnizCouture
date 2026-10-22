import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, ChevronDown, ChevronUp, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { validateFullName, validateEmail, validatePhone } from '../utils/validation';

const FAQS = [
  {
    q: 'How does bespoke bridal & groom sizing work?',
    a: 'Every couture bridal lehenga and bespoke sherwani comes with internal 2-inch margins for seamless alterations. Our bridal styling concierge will coordinate with you via WhatsApp or private video call to record exact anatomical measurements.'
  },
  {
    q: 'Do you ship internationally with insurance?',
    a: 'Yes, we provide insured worldwide express air shipping across the United States, United Kingdom, UAE, Canada, Australia, and Europe via DHL Express Air in custom padded heirloom cases.'
  },
  {
    q: 'Are your silks and zari genuinely certified?',
    a: 'EthnizCouture strictly uses Silk Mark authorized weavers in Varanasi and Kanchipuram. All heavy bridal pieces arrive with a certified certificate of provenance detailing silk purity and bullion zari composition.'
  },
  {
    q: 'What is your return & exchange window?',
    a: 'We offer a complimentary 7-day pickup and size exchange policy for all unstitched sarees, kurtas, and ready-to-wear pieces. Customized bespoke bridal sets undergo rigorous digital video approval prior to dispatch.'
  }
];

export const Contact: React.FC = () => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ethniz_contact_draft');
      return saved ? JSON.parse(saved) : {
        name: '',
        email: '',
        phone: '',
        subject: 'Bridal Consultation',
        message: ''
      };
    } catch {
      return {
        name: '',
        email: '',
        phone: '',
        subject: 'Bridal Consultation',
        message: ''
      };
    }
  });

  // Persist contact form draft across page refreshes
  useEffect(() => {
    try {
      sessionStorage.setItem('ethniz_contact_draft', JSON.stringify(formData));
    } catch {
      // ignore
    }
  }, [formData]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; message?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; phone?: boolean; message?: boolean }>({});

  const validateField = (field: string, value: string) => {
    let err: string | undefined;
    if (field === 'name') err = validateFullName(value, 'Full Name').error;
    else if (field === 'email') err = validateEmail(value).error;
    else if (field === 'phone') err = validatePhone(value, true).error;
    else if (field === 'message') {
      if (!value.trim()) err = 'Message is required.';
      else if (value.trim().length < 10) err = 'Please describe your inquiry in at least 10 characters.';
    }
    setErrors((prev) => ({ ...prev, [field]: err }));
    return !err;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, message: true });

    const isNameValid = validateField('name', formData.name);
    const isEmailValid = validateField('email', formData.email);
    const isPhoneValid = validateField('phone', formData.phone);
    const isMessageValid = validateField('message', formData.message);

    if (!isNameValid || !isEmailValid || !isPhoneValid || !isMessageValid) {
      showToast('Please correct the highlighted errors.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/content/contact', formData);
      showToast(res.data.message || 'Inquiry received. Our bridal concierge will contact you within 24 hours.', 'success');
      try {
        sessionStorage.removeItem('ethniz_contact_draft');
      } catch {
        // ignore
      }
      setFormData({ name: '', email: '', phone: '', subject: 'Bridal Consultation', message: '' });
      setTouched({});
      setErrors({});
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send message. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* 1. SOPHISTICATED HEADER */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#C6A15D] block">
          Private Atelier Consultations
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal text-[#1A1A1A] tracking-tight uppercase">
          LET'S CREATE SOMETHING BEAUTIFUL.
        </h1>
        <p className="font-serif italic text-sm sm:text-base text-zinc-600 max-w-xl mx-auto font-light">
          Whether commissioning an heirloom bridal lehenga or reserving a private styling suite, our couturiers are at your service.
        </p>
        <div className="w-12 h-[1px] bg-[#C6A15D] mx-auto mt-4" />
      </div>

      {/* 2. GRID: FORM ON ONE SIDE + BRAND INFO ON THE OTHER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Contact Form (Left: 7 cols) */}
        <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-lg border border-[#C6A15D]/30 shadow-xs space-y-6">
          <div className="pb-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-normal text-[#1A1A1A]">
                Reserve a Bespoke Consultation
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">Direct connection to our senior head stylists</p>
            </div>
            <Sparkles className="w-5 h-5 text-[#C6A15D]" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-700 mb-1.5 font-sans">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (touched.name) validateField('name', e.target.value);
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, name: true }));
                    validateField('name', formData.name);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-[#FAF7F2] border rounded text-[#1A1A1A] placeholder:text-zinc-400 focus:outline-none transition-colors ${
                    touched.name && errors.name
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                      : 'border-[#C6A15D]/30 focus:border-[#3E1A1E]'
                  }`}
                />
                {touched.name && errors.name && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-700 mb-1.5 font-sans">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="priya@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (touched.email) validateField('email', e.target.value);
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, email: true }));
                    validateField('email', formData.email);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-[#FAF7F2] border rounded text-[#1A1A1A] placeholder:text-zinc-400 focus:outline-none transition-colors ${
                    touched.email && errors.email
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                      : 'border-[#C6A15D]/30 focus:border-[#3E1A1E]'
                  }`}
                />
                {touched.email && errors.email && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-700 mb-1.5 font-sans">
                  Phone / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98200 12345"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (touched.phone) validateField('phone', e.target.value);
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, phone: true }));
                    validateField('phone', formData.phone);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-[#FAF7F2] border rounded text-[#1A1A1A] placeholder:text-zinc-400 focus:outline-none transition-colors ${
                    touched.phone && errors.phone
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                      : 'border-[#C6A15D]/30 focus:border-[#3E1A1E]'
                  }`}
                />
                {touched.phone && errors.phone && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.phone}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-zinc-700 mb-1.5 font-sans">
                  Nature of Inquiry
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#C6A15D]/30 rounded text-[#1A1A1A] focus:outline-none focus:border-[#3E1A1E]"
                >
                  <option value="Bridal Consultation">Bespoke Bridal Lehenga Commission</option>
                  <option value="Groom Sherwani Consultation">Royal Groom Bandhgala / Sherwani</option>
                  <option value="Private Showroom Appointment">Private Atelier Appointment</option>
                  <option value="Order Consignment Assistance">Order Tracking &amp; Fitting</option>
                  <option value="Custom Fabric Inquiry">Artisanal Weave Inquiry</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-zinc-700 mb-1.5 font-sans">
                Tell Us About Your Vision <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                placeholder="Share wedding dates, preferred color tones, embroidery motifs, or questions about our bespoke process..."
                value={formData.message}
                onChange={(e) => {
                  setFormData({ ...formData, message: e.target.value });
                  if (touched.message) validateField('message', e.target.value);
                }}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, message: true }));
                  validateField('message', formData.message);
                }}
                className={`w-full px-3.5 py-2.5 bg-[#FAF7F2] border rounded text-[#1A1A1A] placeholder:text-zinc-400 focus:outline-none transition-colors ${
                  touched.message && errors.message
                    ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                    : 'border-[#C6A15D]/30 focus:border-[#3E1A1E]'
                }`}
              />
              {touched.message && errors.message && (
                <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.message}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[#3E1A1E] hover:bg-[#2B0C10] active:bg-[#1A080B] disabled:bg-zinc-300 text-[#DFC89D] text-xs font-bold tracking-[0.2em] uppercase rounded-lg shadow-md transition-all duration-300 border border-[#C6A15D]/50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5 text-[#C6A15D]" />
              <span>{isSubmitting ? 'Transmitting Inquiry...' : 'TRANSMIT ATELIER INQUIRY'}</span>
            </button>
          </form>
        </div>

        {/* Brand & Contact Information (Right: 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Atelier House Information Card */}
          <div className="bg-[#FAF7F2] p-8 rounded-xl border border-[#E8DEC8] space-y-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-[#C6A15D]/25">
              <div className="p-1.5 rounded bg-[#3E1A1E] border border-[#C6A15D]/40">
                <img src="/logo-card.png" alt="EthnizCouture" className="h-9 w-auto object-contain" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#1A1A1A]">
                  The EthnizCouture Atelier
                </h3>
                <p className="text-[10px] uppercase tracking-wider text-[#C6A15D] font-bold">Haute Fashion House</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-zinc-700">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#C6A15D] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#1A1A1A] font-medium">Flagship Bridal Mansion</strong>
                  <p className="font-light text-zinc-600 mt-0.5">Heritage Lane, Near Mehrauli Archaeological Park, New Delhi, India 110030</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#C6A15D] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#1A1A1A] font-medium">Concierge Hotline & WhatsApp</strong>
                  <p className="font-light text-zinc-600 mt-0.5">+91 98200 88776 • Available 10:00 AM – 8:00 PM IST</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#C6A15D] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#1A1A1A] font-medium">Private Styling Dispatch</strong>
                  <p className="font-light text-zinc-600 mt-0.5">concierge@ethnizcouture.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#C6A15D] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#1A1A1A] font-medium">International Salon Suites</strong>
                  <p className="font-light text-zinc-600 mt-0.5">Mayfair (London) • Downtown (Dubai) by appointment only</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick FAQ Accordion */}
          <div className="bg-white p-6 rounded-lg border border-[#C6A15D]/25 space-y-3 shadow-xs">
            <h3 className="font-serif text-base font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">
              Patron Questions
            </h3>
            
            <div className="divide-y divide-zinc-100 text-xs">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="py-2.5">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between text-left font-medium text-[#1A1A1A] hover:text-[#3E1A1E]"
                  >
                    <span>{faq.q}</span>
                    {activeFaq === idx ? (
                      <ChevronUp className="w-4 h-4 text-[#C6A15D] shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0 ml-2" />
                    )}
                  </button>
                  {activeFaq === idx && (
                    <p className="text-zinc-600 mt-2 leading-relaxed font-light pl-1">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
