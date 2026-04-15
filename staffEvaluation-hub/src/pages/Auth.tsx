import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { API_URL, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { GraduationCap, Mail, Lock, Loader2 } from 'lucide-react';
import { z } from 'zod';

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

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // FE-5: per-field errors rendered inline. Keyed by field name ('email' |
  // 'password') — either set locally by the zod validator, or populated
  // from an ApiError.fields payload returned by the backend.
  const [signInErrors, setSignInErrors] = useState<Record<string, string>>({});
  const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validateForm = (
    email: string,
    password: string,
    isRegister: boolean,
  ): Record<string, string> | null => {
    const schema = isRegister ? registerSchema : loginSchema;
    const result = schema.safeParse({ email, password });
    if (result.success) return null;
    const errors: Record<string, string> = {};
    for (const issue of result.error.errors) {
      const key = String(issue.path[0] ?? 'form');
      if (!errors[key]) errors[key] = issue.message;
    }
    return errors;
  };

  // FE-5: turn an ApiError from sign-in/sign-up into field-level errors.
  // Server emits `fields: { email: [...], password: [...] }`; if missing,
  // fall back to mapping the top-level message onto the likeliest field.
  const toFieldErrors = (
    err: Error,
    fallbackMessage: string,
  ): { fields: Record<string, string>; topLevel?: string } => {
    if (err instanceof ApiError && err.hasFieldErrors()) {
      const fields: Record<string, string> = {};
      for (const [path, msgs] of Object.entries(err.fields)) {
        const key = path.split('.')[0];
        if (!fields[key] && msgs[0]) fields[key] = msgs[0];
      }
      return { fields };
    }
    return { fields: {}, topLevel: fallbackMessage };
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const zodErrors = validateForm(signInEmail, signInPassword, false);
    if (zodErrors) {
      setSignInErrors(zodErrors);
      return;
    }
    setSignInErrors({});

    setIsSubmitting(true);
    const { error } = await signIn(signInEmail, signInPassword);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid credentials')) {
        toast.error('Email hoặc mật khẩu không đúng');
      } else {
        const { fields, topLevel } = toFieldErrors(
          error,
          'Đăng nhập thất bại: ' + error.message,
        );
        if (Object.keys(fields).length > 0) {
          setSignInErrors(fields);
        } else if (topLevel) {
          toast.error(topLevel);
        }
      }
    } else {
      toast.success('Đăng nhập thành công!');
      navigate('/dashboard');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const zodErrors = validateForm(signUpEmail, signUpPassword, true);
    if (zodErrors) {
      setSignUpErrors(zodErrors);
      return;
    }
    setSignUpErrors({});

    setIsSubmitting(true);
    const { error } = await signUp(signUpEmail, signUpPassword);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setSignUpErrors({ email: 'Email này đã được đăng ký' });
      } else {
        const { fields, topLevel } = toFieldErrors(
          error,
          'Đăng ký thất bại: ' + error.message,
        );
        if (Object.keys(fields).length > 0) {
          setSignUpErrors(fields);
        } else if (topLevel) {
          toast.error(topLevel);
        }
      }
    } else {
      toast.success('Đăng ký thành công! Đang chuyển hướng...');
      navigate('/dashboard');
    }
  };

  const handleMicrosoftLogin = () => {
    window.location.href = `${API_URL}/auth/microsoft`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Hệ Thống Đánh Giá Giảng Viên
          </h1>
          <p className="text-muted-foreground mt-2">
            Đánh giá đồng nghiệp trong nhóm
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <Tabs defaultValue="signin" className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
                <TabsTrigger value="signup">Đăng ký</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-6">
              <TabsContent value="signin" className="mt-0">
                <CardTitle className="text-lg mb-1">Chào mừng trở lại</CardTitle>
                <CardDescription className="mb-4">
                  Đăng nhập để tiếp tục đánh giá
                </CardDescription>

                {/* Microsoft Login Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mb-4"
                  onClick={handleMicrosoftLogin}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                  Đăng nhập bằng tài khoản HUST
                </Button>

                <div className="relative mb-4">
                  <Separator />
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    hoặc
                  </span>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="email@example.com"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        className="pl-10"
                        aria-invalid={!!signInErrors.email}
                        aria-describedby={signInErrors.email ? 'signin-email-error' : undefined}
                        required
                      />
                    </div>
                    {signInErrors.email && (
                      <p id="signin-email-error" className="text-xs text-destructive">
                        {signInErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        className="pl-10"
                        aria-invalid={!!signInErrors.password}
                        aria-describedby={signInErrors.password ? 'signin-password-error' : undefined}
                        required
                      />
                    </div>
                    {signInErrors.password && (
                      <p id="signin-password-error" className="text-xs text-destructive">
                        {signInErrors.password}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đăng nhập...
                      </>
                    ) : (
                      'Đăng nhập'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <CardTitle className="text-lg mb-1">Tạo tài khoản</CardTitle>
                <CardDescription className="mb-4">
                  Đăng ký để bắt đầu đánh giá đồng nghiệp
                </CardDescription>

                <form onSubmit={handleSignUp} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="email@example.com"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        className="pl-10"
                        aria-invalid={!!signUpErrors.email}
                        aria-describedby={signUpErrors.email ? 'signup-email-error' : undefined}
                        required
                      />
                    </div>
                    {signUpErrors.email && (
                      <p id="signup-email-error" className="text-xs text-destructive">
                        {signUpErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Ít nhất 8 ký tự, gồm chữ hoa, thường, số"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        className="pl-10"
                        aria-invalid={!!signUpErrors.password}
                        aria-describedby={signUpErrors.password ? 'signup-password-error' : undefined}
                        required
                        minLength={8}
                      />
                    </div>
                    {signUpErrors.password && (
                      <p id="signup-password-error" className="text-xs text-destructive">
                        {signUpErrors.password}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đăng ký...
                      </>
                    ) : (
                      'Đăng ký'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          &copy; 2026 Hệ Thống Đánh Giá Giảng Viên
        </p>
      </div>
    </div>
  );
}
