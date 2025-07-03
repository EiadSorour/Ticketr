'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { useSignUp } from '@clerk/nextjs';
import { toast } from "sonner";

export default function SignUpPage() {
  const [verifying, setVerifying] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber1, setPhoneNumber1] = useState('');
  const [phoneNumber2, setPhoneNumber2] = useState('');
  const [code, setCode] = useState(''); // State for the verification code
  const [isLoadingSignUp, setIsLoadingSignUp] = useState(false);
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);

  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  async function handleSignUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    if(phoneNumber1.length < 10 || phoneNumber2.length < 10){
      toast.warning("Number must be at least 10 digits");
      return;
    }

    setIsLoadingSignUp(true);
    try {
      await signUp.create({
        emailAddress,
        password,
        firstName,
        lastName,
        unsafeMetadata: {
          address,
          phoneNumber1,
          phoneNumber2,
        },
      });
      await signUp.prepareEmailAddressVerification();
      setVerifying(true);
    } catch (err: any) {
      console.error('Error during sign-up:', err);
      let errorMessage = "An unexpected error occurred.";
      if (err.errors && err.errors.length > 0) {
        errorMessage = err.errors[0].longMessage || err.errors[0].message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoadingSignUp(false);
    }
  }

  async function handleVerificationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsLoadingVerify(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        // Force a full page reload to ensure the Clerk session is active across the entire application
        window.location.href = '/';
      } else {
        console.error('Verification failed:', attempt);
        toast.error("Verification failed. Please check the code and try again.");
      }
    } catch (err: any) {
      console.error('Error during verification:', err);
      let errorMessage = "An unexpected error occurred.";
      if (err.errors && err.errors.length > 0) {
        errorMessage = err.errors[0].longMessage || err.errors[0].message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoadingVerify(false);
    }
  }

  return (
    <div className="my-5 flex items-center justify-center">
      {verifying ? (
        <form onSubmit={handleVerificationSubmit}>
          <Card className="w-full sm:w-96">
            <CardHeader>
              <CardTitle>Verify your email</CardTitle>
              <CardDescription>Please enter the verification code sent to your email address.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-y-4">
              <div>
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  type="text"
                  id="verificationCode"
                  name="verificationCode"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={!isLoaded || isLoadingVerify}>{isLoadingVerify ? "Verifying..." : "Verify"}</Button>
            </CardFooter>
          </Card>
        </form>
      ) : (
        <form onSubmit={handleSignUpSubmit}>
          <Card className="w-full sm:w-96">
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>Welcome! Please fill in the details to get started.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-y-4">
              <div>
                <Label htmlFor="name">First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  type="text"
                  id="firstName"
                  name="firstName"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  type="text"
                  id="lastName"
                  name="lastName"
                  required
                />
              </div>
              <div>
                <Label htmlFor="emailAddress">Email address</Label>
                <Input
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  type="email"
                  id="emailAddress"
                  name="emailAddress"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  id="password"
                  name="password"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  type="text"
                  id="address"
                  name="address"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber1">Phone Number 1</Label>
                <PhoneInput
                  value={phoneNumber1}
                  onChange={(phone) => setPhoneNumber1(phone)}
                  required
                  inputProps={{ id: "phoneNumber1", name: "phoneNumber1" }}
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber2">Phone Number 2</Label>
                <PhoneInput
                  value={phoneNumber2}
                  required
                  onChange={(phone) => setPhoneNumber2(phone)}
                  inputProps={{ id: "phoneNumber2", name: "phoneNumber2" }}
                />
              </div>
            </CardContent>

            <CardFooter>
              <div className="grid w-full gap-y-4">
                <Button type="submit" disabled={!isLoaded || isLoadingSignUp}>
                 {isLoadingSignUp ? "Signing up..." : "Sign Up"}
                </Button>
                <p className="text-sm text-center">
                  Already have an account? <Link href="/sign-in" className="font-medium text-primary hover:underline">Sign in</Link>
                </p>
              </div>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
} 