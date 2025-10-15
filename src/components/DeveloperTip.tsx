import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Coffee, Zap, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function DeveloperTip() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('100');
  const [invoice, setInvoice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText('studio314@getalby.com');
      toast({
        title: 'Address copied!',
        description: 'Lightning address copied to clipboard.',
      });
    } catch (err) {
      console.error('Failed to copy address:', err);
      // Fallback for when clipboard API is blocked
      try {
        const textArea = document.createElement('textarea');
        textArea.value = 'studio314@getalby.com';
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({
          title: 'Address copied!',
          description: 'Lightning address copied to clipboard.',
        });
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
        // Final fallback - show alert
        alert('Lightning address: studio314@getalby.com');
      }
    }
  };

  const handleCopyInvoice = async () => {
    if (invoice) {
      try {
        await navigator.clipboard.writeText(invoice);
        setCopied(true);
        toast({
          title: 'Invoice copied!',
          description: 'Lightning invoice copied to clipboard.',
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy invoice:', err);
      }
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const [username, domain] = 'studio314@getalby.com'.split('@');
      const url = `https://${domain}/.well-known/lnurlp/${username}?amount=${parseInt(amount) * 1000}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.callback) {
        const callbackUrl = `${data.callback}?amount=${parseInt(amount) * 1000}`;
        const callbackResponse = await fetch(callbackUrl);
        const callbackData = await callbackResponse.json();

        if (callbackResponse.ok && callbackData.pr) {
          setInvoice(callbackData.pr);
        } else {
          toast({
            title: 'Invoice generation failed',
            description: 'Could not generate lightning invoice.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Invoice generation failed',
          description: 'Could not connect to lightning service.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Invoice generation failed',
        description: 'An error occurred while generating invoice.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Coffee className="h-5 w-5 text-lime-400" />
            <h3 className="text-lg font-semibold text-lime-400">Support Developer</h3>
          </div>

          <p className="text-sm text-lime-100/80">
            Enjoying Spookstr? Help keep the paranormal portal open with a lightning tip!
          </p>

          <div className="flex justify-center space-x-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-lime-500 hover:bg-lime-400 text-black font-semibold">
                  <Zap className="h-4 w-4 mr-2" />
                  Zap Developer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-lime-400">Support Spookstr Developer</DialogTitle>
                  <DialogDescription>
                    Send a lightning tip to support continued development of Spookstr
                  </DialogDescription>
                </DialogHeader>

                {!invoice ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Amount (sats)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="100"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-black/20 border-lime-500/30 text-lime-100"
                      />
                    </div>

                    <Button
                      onClick={handleGenerateInvoice}
                      className="w-full bg-lime-500 hover:bg-lime-400 text-black"
                    >
                      Generate Invoice
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invoice">Lightning Invoice</Label>
                      <div className="flex gap-2">
                        <Input
                          id="invoice"
                          value={invoice}
                          readOnly
                          className="font-mono text-xs bg-black/20 border-lime-500/30 text-lime-100"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyInvoice}
                          className="border-lime-500/50 text-lime-400 hover:border-lime-400 hover:text-lime-300"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        const lightningUrl = `lightning:${invoice}`;

                        // Try to open the lightning URL
                        try {
                          window.open(lightningUrl, '_blank');

                          // Also try to copy to clipboard as fallback
                          navigator.clipboard.writeText(invoice).then(() => {
                            toast({
                              title: 'Invoice copied to clipboard',
                              description: 'You can also paste this invoice into your wallet.',
                            });
                          }).catch(() => {
                            // If clipboard fails, show the invoice for manual copy
                            alert(`Lightning Invoice:\n\n${invoice}`);
                          });
                        } catch (error) {
                          console.error('Failed to open lightning URL:', error);

                          // Fallback: copy to clipboard and show instructions
                          navigator.clipboard.writeText(invoice).then(() => {
                            toast({
                              title: 'Invoice copied to clipboard',
                              description: 'Please paste this invoice into your lightning wallet.',
                            });
                          }).catch(() => {
                            // If clipboard fails, show the invoice for manual copy
                            alert(`Lightning Invoice (copy this):\n\n${invoice}`);
                          });
                        }
                      }}
                      className="w-full border-lime-500/50 text-lime-400 hover:border-lime-400 hover:text-lime-300"
                    >
                      Open in Wallet
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setInvoice(null);
                        setAmount('100');
                      }}
                      className="w-full text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10"
                    >
                      Generate New Invoice
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={handleCopyAddress}
              className="border-lime-500/50 text-lime-400 hover:border-lime-400 hover:text-lime-300"
            >
              Copy LN Address
            </Button>
          </div>

          <p className="text-xs text-lime-500/60">
            studio314@getalby.com
          </p>
        </div>
      </CardContent>
    </Card>
  );
}