"use client"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, signUp } from '@/lib/auth-client'
import { Chrome, Github, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'

const LoginPage = () => {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    setIsLoading(true)
    try {
      if (isSignUp) {
        if (!name.trim()) {
          toast.error('Please enter your name')
          setIsLoading(false)
          return
        }
        await signUp.email({
          email,
          password,
          name,
          fetchOptions: {
            onSuccess: () => {
              toast.success('Account created! Logging in...')
              router.push('/')
              router.refresh()
            },
            onError: (ctx) => {
              toast.error(ctx.error.message || 'Failed to sign up')
            },
          },
        })
      } else {
        await signIn.email({
          email,
          password,
          fetchOptions: {
            onSuccess: () => {
              toast.success('Logged in successfully!')
              router.push('/')
              router.refresh()
            },
            onError: (ctx) => {
              toast.error(ctx.error.message || 'Invalid credentials')
            },
          },
        })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Authentication error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className='flex min-h-screen bg-zinc-50 dark:bg-transparent px-4 py-12 md:py-24'>
      <div className='bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]'>
        <div className='p-8 pb-6'>
          <div>
            <Link href={"/"}>
              <h1 className='text-2xl font-bold text-indigo-400'>PostBoy</h1>
            </Link>
            <h2 className='mb-1 mt-3 text-xl font-semibold'>
              {isSignUp ? 'Create an account' : 'Sign in to PostBoy'}
            </h2>
            <p className="text-sm text-zinc-400">
              {isSignUp ? 'Sign up to manage your workspaces and APIs' : 'Welcome back! Sign in to continue'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className='mt-5 space-y-3'>
            {isSignUp && (
              <div>
                <Label htmlFor='name' className="text-xs">Full Name</Label>
                <Input
                  id='name'
                  type='text'
                  placeholder='John Doe'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className='mt-1'
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor='email' className="text-xs">Email</Label>
              <Input
                id='email'
                type='email'
                placeholder='name@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='mt-1'
                required
              />
            </div>
            <div>
              <Label htmlFor='password' className="text-xs">Password</Label>
              <Input
                id='password'
                type='password'
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='mt-1'
                required
              />
            </div>
            <Button type='submit' className='w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-2' disabled={isLoading}>
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className='text-center my-3'>
            <button
              type='button'
              onClick={() => setIsSignUp(!isSignUp)}
              className='text-xs text-indigo-400 hover:underline'
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className='relative my-4'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t border-zinc-800' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-card px-2 text-zinc-500'>Or continue with</span>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-2'>
            <Button variant='outline' className='w-full' onClick={() => signIn.social({
              provider: 'github',
              callbackURL: "/"
            })}>
              <Github className='mr-2 h-4 w-4' />
              GitHub
            </Button>
            <Button variant='outline' className='w-full' onClick={() => signIn.social({
              provider: 'google',
              callbackURL: "/"
            })}>
              <Chrome className='mr-2 h-4 w-4' />
              Google
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LoginPage