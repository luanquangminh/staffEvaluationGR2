import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ').max(255),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').max(100),
});

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ').max(255),
  password: z.string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .max(100)
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
    .regex(/\d/, 'Mật khẩu phải có ít nhất 1 chữ số'),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type AuthTab = 'hust' | 'login' | 'signup';

const TABS: { id: AuthTab; label: string }[] = [
  { id: 'hust', label: 'Outlook' },
  { id: 'login', label: 'Đăng nhập' },
  { id: 'signup', label: 'Đăng ký' },
];

const STATS = [
  { value: '2.4k+', label: 'đánh giá đã thực hiện' },
  { value: '180', label: 'nhân sự đang tham gia' },
  { value: '96%', label: 'hoàn thành đúng hạn' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateForm(
  email: string,
  password: string,
  isRegister: boolean,
): Record<string, string> | null {
  const schema = isRegister ? registerSchema : loginSchema;
  const result = schema.safeParse({ email, password });
  if (result.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of result.error.errors) {
    const key = String(issue.path[0] ?? 'form');
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

function toFieldErrors(
  err: Error,
  fallbackMessage: string,
): { fields: Record<string, string>; topLevel?: string } {
  if (err instanceof ApiError && err.hasFieldErrors()) {
    const fields: Record<string, string> = {};
    for (const [path, msgs] of Object.entries(err.fields)) {
      const key = path.split('.')[0];
      if (!fields[key] && msgs[0]) fields[key] = msgs[0];
    }
    return { fields };
  }
  return { fields: {}, topLevel: fallbackMessage };
}

// ---------------------------------------------------------------------------
// Password input with toggle
// ---------------------------------------------------------------------------

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete ?? 'current-password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 rounded-lg pl-10 pr-11 text-[14.5px]"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          required
          minLength={minLength}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label={show ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {show ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
          </TooltipContent>
        </Tooltip>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signInWithHust, signUp, loading } = useAuth();

  const [tab, setTab] = useState<AuthTab>('hust');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hustEmail, setHustEmail] = useState('');
  const [hustPassword, setHustPassword] = useState('');
  const [hustErrors, setHustErrors] = useState<Record<string, string>>({});

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInErrors, setSignInErrors] = useState<Record<string, string>>({});

  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleHustLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const zodErrors = validateForm(hustEmail, hustPassword, false);
    if (zodErrors) { setHustErrors(zodErrors); return; }
    setHustErrors({});

    setIsSubmitting(true);
    const { error } = await signInWithHust(hustEmail, hustPassword);
    setIsSubmitting(false);

    if (error) {
      const msg = error.message;
      if (msg.includes('hust.edu.vn')) {
        setHustErrors({ email: 'Vui lòng sử dụng email Outlook của tổ chức' });
      } else if (msg.includes('không đúng') || msg.includes('Invalid')) {
        toast.error('Email hoặc mật khẩu Outlook không đúng');
      } else if (msg.includes('unavailable') || msg.includes('không khả dụng')) {
        toast.error('Dịch vụ xác thực Outlook tạm thời không khả dụng');
      } else {
        const { fields, topLevel } = toFieldErrors(error, 'Đăng nhập thất bại: ' + msg);
        if (Object.keys(fields).length > 0) setHustErrors(fields);
        else if (topLevel) toast.error(topLevel);
      }
    } else {
      toast.success('Đăng nhập thành công!');
      navigate('/dashboard');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const zodErrors = validateForm(signInEmail, signInPassword, false);
    if (zodErrors) { setSignInErrors(zodErrors); return; }
    setSignInErrors({});

    setIsSubmitting(true);
    const { error } = await signIn(signInEmail, signInPassword);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid credentials')) {
        toast.error('Email hoặc mật khẩu không đúng');
      } else {
        const { fields, topLevel } = toFieldErrors(error, 'Đăng nhập thất bại: ' + error.message);
        if (Object.keys(fields).length > 0) setSignInErrors(fields);
        else if (topLevel) toast.error(topLevel);
      }
    } else {
      toast.success('Đăng nhập thành công!');
      navigate('/dashboard');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const zodErrors = validateForm(signUpEmail, signUpPassword, true);
    if (zodErrors) { setSignUpErrors(zodErrors); return; }
    setSignUpErrors({});

    setIsSubmitting(true);
    const { error } = await signUp(signUpEmail, signUpPassword);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setSignUpErrors({ email: 'Email này đã được đăng ký' });
      } else {
        const { fields, topLevel } = toFieldErrors(error, 'Đăng ký thất bại: ' + error.message);
        if (Object.keys(fields).length > 0) setSignUpErrors(fields);
        else if (topLevel) toast.error(topLevel);
      }
    } else {
      toast.success('Đăng ký thành công! Đang chuyển hướng...');
      navigate('/dashboard');
    }
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Active form config
  // -----------------------------------------------------------------------

  const formConfig: Record<AuthTab, {
    title: string;
    description: string;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    emailId: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailValue: string;
    setEmail: (v: string) => void;
    passwordId: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    passwordValue: string;
    setPassword: (v: string) => void;
    errors: Record<string, string>;
    buttonLabel: string;
    buttonIcon?: React.ReactNode;
    autoComplete: string;
    isRegister: boolean;
    footerNote?: string;
  }> = {
    hust: {
      title: 'Đăng nhập Outlook',
      description: 'Sử dụng tài khoản Outlook của tổ chức để đăng nhập',
      onSubmit: handleHustLogin,
      emailId: 'hust-email',
      emailLabel: 'Email Outlook',
      emailPlaceholder: 'user@company.com',
      emailValue: hustEmail,
      setEmail: setHustEmail,
      passwordId: 'hust-password',
      passwordLabel: 'Mật khẩu Outlook',
      passwordPlaceholder: '••••••••',
      passwordValue: hustPassword,
      setPassword: setHustPassword,
      errors: hustErrors,
      buttonLabel: 'Đăng nhập bằng tài khoản Outlook',
      buttonIcon: <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />,
      autoComplete: 'current-password',
      isRegister: false,
      footerNote: 'Mật khẩu được xác thực trực tiếp với Outlook — chúng tôi không lưu trữ.',
    },
    login: {
      title: 'Chào mừng trở lại',
      description: 'Đăng nhập bằng tài khoản hệ thống',
      onSubmit: handleSignIn,
      emailId: 'signin-email',
      emailLabel: 'Email',
      emailPlaceholder: 'email@example.com',
      emailValue: signInEmail,
      setEmail: setSignInEmail,
      passwordId: 'signin-password',
      passwordLabel: 'Mật khẩu',
      passwordPlaceholder: '••••••••',
      passwordValue: signInPassword,
      setPassword: setSignInPassword,
      errors: signInErrors,
      buttonLabel: 'Đăng nhập',
      autoComplete: 'current-password',
      isRegister: false,
    },
    signup: {
      title: 'Tạo tài khoản',
      description: 'Đăng ký để bắt đầu đánh giá đồng nghiệp',
      onSubmit: handleSignUp,
      emailId: 'signup-email',
      emailLabel: 'Email',
      emailPlaceholder: 'email@example.com',
      emailValue: signUpEmail,
      setEmail: setSignUpEmail,
      passwordId: 'signup-password',
      passwordLabel: 'Mật khẩu',
      passwordPlaceholder: 'Ít nhất 8 ký tự, gồm chữ hoa, thường, số',
      passwordValue: signUpPassword,
      setPassword: setSignUpPassword,
      errors: signUpErrors,
      buttonLabel: 'Đăng ký',
      autoComplete: 'new-password',
      isRegister: true,
    },
  };

  const f = formConfig[tab];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-[1.1fr_1fr]">
        {/* ============ LEFT — brand panel ============ */}
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-950 via-blue-800 to-blue-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -right-24 -top-40 h-[520px] w-[520px] rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -right-12 -top-24 h-[360px] w-[360px] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-48 -left-28 h-[420px] w-[420px] rounded-full bg-white/[0.06]" />

          <div className="relative z-10">
            <Logo variant="light" size={44} withWordmark />
          </div>

          <div className="relative z-10 max-w-[440px]">
            <Badge
              variant="outline"
              className="mb-5 border-white/25 bg-white/10 text-white/90 backdrop-blur-sm hover:bg-white/10"
            >
              <Sparkles className="mr-1.5 h-3 w-3" />
              Hệ thống đánh giá chéo nhân sự
            </Badge>

            <h1 className="text-[42px] font-semibold leading-[1.08] tracking-tight">
              Đánh giá chéo nhân sự.
              <br />
              <span className="text-white/70">
                Minh bạch, công bằng,
                <br />
                và đúng quy trình.
              </span>
            </h1>

            <p className="mt-5 max-w-[380px] text-[15px] leading-relaxed text-white/85">
              Đăng nhập bằng tài khoản Outlook để bắt đầu chu kỳ đánh giá chéo
              nhân sự trong nhóm chuyên môn của bạn.
            </p>
          </div>

          <div className="relative z-10 flex gap-8">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  'pr-8',
                  i < STATS.length - 1 && 'border-r border-white/20',
                )}
              >
                <div className="text-[26px] font-semibold tracking-tight">
                  {s.value}
                </div>
                <div className="mt-0.5 text-xs text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* ============ RIGHT — form ============ */}
        <main className="flex flex-col justify-between px-6 py-8 sm:px-14 sm:py-12">
          <div className="flex items-center justify-between text-sm">
            <div className="lg:hidden">
              <Logo size={36} />
            </div>
            <div className="ml-auto flex items-center gap-2 text-slate-500">
              {tab !== 'signup' ? (
                <>
                  Chưa có tài khoản?
                  <Button
                    variant="link"
                    className="h-auto p-0 font-medium text-slate-900"
                    onClick={() => setTab('signup')}
                  >
                    Đăng ký
                  </Button>
                </>
              ) : (
                <>
                  Đã có tài khoản?
                  <Button
                    variant="link"
                    className="h-auto p-0 font-medium text-slate-900"
                    onClick={() => setTab('hust')}
                  >
                    Đăng nhập
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[420px]">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {f.title}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">{f.description}</p>

            {/* segmented tabs */}
            <div
              role="tablist"
              className="mt-7 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'rounded-lg px-2 py-2 text-sm font-medium transition-all',
                    tab === t.id
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={f.onSubmit} className="mt-6 space-y-4" noValidate>
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor={f.emailId} className="text-sm font-medium">
                  {f.emailLabel}
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id={f.emailId}
                    type="email"
                    autoComplete="username"
                    placeholder={f.emailPlaceholder}
                    value={f.emailValue}
                    onChange={(e) => f.setEmail(e.target.value)}
                    className="h-12 rounded-lg pl-10 text-[14.5px]"
                    aria-invalid={!!f.errors.email}
                    aria-describedby={f.errors.email ? `${f.emailId}-error` : undefined}
                    required
                  />
                </div>
                {f.errors.email && (
                  <p id={`${f.emailId}-error`} className="text-xs text-destructive">
                    {f.errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <PasswordField
                id={f.passwordId}
                label={f.passwordLabel}
                placeholder={f.passwordPlaceholder}
                value={f.passwordValue}
                onChange={f.setPassword}
                error={f.errors.password}
                autoComplete={f.autoComplete}
                minLength={f.isRegister ? 8 : undefined}
              />

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="group h-12 w-full rounded-lg bg-slate-900 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.55)] hover:bg-slate-800"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tab === 'signup' ? 'Đang đăng ký...' : 'Đang đăng nhập...'}
                  </>
                ) : (
                  <>
                    {f.buttonLabel}
                    {f.buttonIcon}
                  </>
                )}
              </Button>

              {f.footerNote && (
                <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-500">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  <span>{f.footerNote}</span>
                </div>
              )}
            </form>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>&copy; 2026 Hệ Thống Đánh Giá Chéo Nhân Sự</span>
            <div className="flex gap-5">
              <a href="#" className="hover:text-slate-600">
                Hỗ trợ
              </a>
              <a href="#" className="hover:text-slate-600">
                Chính sách
              </a>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
