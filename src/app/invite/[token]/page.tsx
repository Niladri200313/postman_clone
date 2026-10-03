import { currentUser } from '@/modules/authentication/actions';
import { acceptWorkspaceInvite } from '@/modules/invites/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, ArrowRight } from 'lucide-react';
import React from 'react';

const Invite = async ({ params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params;
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const result = await acceptWorkspaceInvite(token);

  if (result.success) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="max-w-md w-full bg-zinc-900 border-zinc-800 text-zinc-100 text-center p-6 space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-amber-500/10 rounded-full text-amber-400">
            <AlertCircle className="w-8 h-8" />
          </div>
        </div>
        <CardHeader className="p-0">
          <CardTitle className="text-xl font-bold">Invite Not Available</CardTitle>
          <CardDescription className="text-zinc-400 text-sm mt-1">
            {result.error || "This invite link is invalid, expired, or has already been used."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <Link href="/">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2">
              Go to Workspace Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invite;