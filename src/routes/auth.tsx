import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudRain, Mail, User, Shield, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CloudsBackdrop, RainBackdrop } from "@/components/weather-backdrop";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Access · Monsoon Copilot" }] }),
  validateSearch: (search: Record<string, unknown>): AuthSearch => {
    return {
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
  component: AuthPage,
});

type AuthSearch = {
  redirect?: string;
};

function AuthPage() {
  const navigate = useNavigate();
  // @ts-ignore
  const search = useSearch({ from: "/auth" }) as AuthSearch;
  const redirectPath = search.redirect || "/dashboard";

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("citizen");
  const [phone, setPhone] = useState("");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [locating, setLocating] = useState(false);
  
  // OTP flow state
  const [step, setStep] = useState<"details" | "otp">("details");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    toast.info("Fetching GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocating(false);
        toast.success("GPS location detected successfully!");
      },
      (error) => {
        setLocating(false);
        toast.error("Could not detect GPS coordinates. Please enter manually.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      if (activeTab === "login") {
        await api.auth.login(email);
        toast.success("Verification code sent to your email.");
      } else {
        if (!name) {
          toast.error("Please enter your name.");
          setLoading(false);
          return;
        }
        if (!locationName) {
          toast.error("Please enter your location or address.");
          setLoading(false);
          return;
        }
        await api.auth.register(
          name,
          email,
          role,
          locationName,
          latitude !== "" ? Number(latitude) : undefined,
          longitude !== "" ? Number(longitude) : undefined,
          phone || undefined
        );
        toast.success("Account created! Verification code sent to email.");
      }
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length < 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.verifyOtp(email, otp);
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));
      
      toast.success(`Welcome back, ${res.user.name}!`);
      navigate({ to: redirectPath });
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired verification code.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center gradient-sky px-6 py-12">
      <CloudsBackdrop />
      <RainBackdrop density={20} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass rounded-3xl p-8 shadow-elegant border border-white/50 bg-white/70 backdrop-blur-xl">
          {/* Header logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="gradient-hero flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-glow mb-3">
              <CloudRain className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold gradient-text">Monsoon Copilot</h1>
            <p className="text-sm text-muted-foreground mt-1">Get emergency ready in seconds</p>
          </div>

          <AnimatePresence mode="wait">
            {step === "details" ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
              >
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-200/50 p-1 mb-6">
                    <TabsTrigger value="login" className="rounded-xl py-2 font-medium">Sign In</TabsTrigger>
                    <TabsTrigger value="register" className="rounded-xl py-2 font-medium">Sign Up</TabsTrigger>
                  </TabsList>

                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    {activeTab === "register" && (
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="name"
                            placeholder=""
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="pl-10 glass border-white/60 h-11"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder=""
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 glass border-white/60 h-11"
                          required
                        />
                      </div>
                    </div>

                    {activeTab === "register" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                          <Input
                            id="phone"
                            placeholder=""
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="glass border-white/60 h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="locationName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address / City</Label>
                            <button
                              type="button"
                              onClick={detectLocation}
                              disabled={locating}
                              className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1"
                            >
                              📍 {locating ? "Locating..." : "Detect GPS"}
                            </button>
                          </div>
                          <Input
                            id="locationName"
                            placeholder=""
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            className="glass border-white/60 h-11"
                            required
                          />
                        </div>
                      </>
                    )}

                    {activeTab === "register" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Profile Role</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "citizen", label: "Citizen" },
                            { id: "volunteer", label: "Volunteer" },
                            { id: "ngo", label: "NGO Member" },
                            { id: "admin", label: "Govt Official" },
                          ].map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setRole(r.id)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                                role === r.id
                                  ? "gradient-hero text-white border-transparent shadow-elegant"
                                  : "bg-white/40 border-white/60 text-muted-foreground hover:bg-white/60"
                              }`}
                            >
                              <Shield className="h-3.5 w-3.5" />
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full gradient-hero border-0 text-white shadow-elegant h-11 rounded-xl font-medium mt-6"
                    >
                      {loading ? "Sending..." : "Send Verification OTP"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Tabs>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <button
                  onClick={() => setStep("details")}
                  className="self-start flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-6 transition"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to details
                </button>

                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold">Verify email address</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto">
                    We sent a 6-digit authentication code to <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}
                  className="flex flex-col items-center w-full space-y-6"
                >
                  <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                    value={otp}
                    onChange={(val) => setOtp(val)}
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="w-12 h-12 text-lg glass border-white/60 rounded-xl" />
                      <InputOTPSlot index={1} className="w-12 h-12 text-lg glass border-white/60 rounded-xl" />
                      <InputOTPSlot index={2} className="w-12 h-12 text-lg glass border-white/60 rounded-xl" />
                      <InputOTPSlot index={3} className="w-12 h-12 text-lg glass border-white/60 rounded-xl" />
                      <InputOTPSlot index={4} className="w-12 h-12 text-lg glass border-white/60 rounded-xl" />
                      <InputOTPSlot index={5} className="w-12 h-12 text-lg glass border-white/60 rounded-xl" />
                    </InputOTPGroup>
                  </InputOTP>

                  <Button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full gradient-hero border-0 text-white shadow-elegant h-11 rounded-xl font-medium"
                  >
                    {loading ? "Verifying..." : "Confirm & Enter App"}
                  </Button>

                  <p className="text-[11px] text-muted-foreground">
                    Didn't receive the email?{" "}
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      className="text-primary font-semibold hover:underline"
                    >
                      Resend code
                    </button>
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
