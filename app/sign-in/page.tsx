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
import { useSignIn } from '@clerk/nextjs';
import { toast } from "sonner";

export default function SignInPage() {
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // Force a full page reload to ensure the Clerk session is active across the entire application
        // Temporarily disable onbeforeunload to prevent browser alert on redirect
        window.location.href = "/";
      } else {
        console.error('Sign-in failed:', result);
        toast.error("Sign-in failed. Please check your credentials and try again.");
      }
    } catch (err: any) {
      console.error('Error during sign-in:', err);
      let errorMessage = "An unexpected error occurred.";
      if (err.errors && err.errors.length > 0) {
        errorMessage = err.errors[0].longMessage || err.errors[0].message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="my-5 flex items-center justify-center">
      <form onSubmit={handleSubmit} >
        <Card className="w-full sm:w-96">
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>Welcome back! Please enter your details.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-y-4">
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
          </CardContent>

          <CardFooter>
            <div className="grid w-full gap-y-4">
              <Button type="submit" disabled={!isLoaded || isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
              <p className="text-sm text-center">
                Don't have an account?{' '}
                <Link href="/sign-up" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
