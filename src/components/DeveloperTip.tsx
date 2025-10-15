import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZapDialog } from '@/components/ZapDialog';
import { Coffee, Zap } from 'lucide-react';

const DEVELOPER_PUBKEY = '0155373ac79b7ffb0f586c3e68396f9e82d46f7afe7016d46ed9ca46ba3e1bed';
const DEVELOPER_LN_ADDRESS = 'studio314@getalby.com';

export function DeveloperTip() {
  const [showZapDialog, setShowZapDialog] = useState(false);

  return (
    <>
      <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Coffee className="h-5 w-5 text-lime-400" />
              <h3 className="text-lg font-semibold text-lime-400">Support the Developer</h3>
            </div>
            
            <p className="text-sm text-lime-100/80">
              Enjoying Spookstr? Help keep the paranormal portal open with a lightning tip!
            </p>
            
            <div className="flex justify-center space-x-3">
              <Button
                onClick={() => setShowZapDialog(true)}
                className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
              >
                <Zap className="h-4 w-4 mr-2" />
                Zap Developer
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(DEVELOPER_LN_ADDRESS);
                  // You could add a toast notification here
                }}
                className="border-lime-500/50 text-lime-400 hover:border-lime-400 hover:text-lime-300"
              >
                Copy LN Address
              </Button>
            </div>
            
            <p className="text-xs text-lime-500/60">
              {DEVELOPER_LN_ADDRESS}
            </p>
          </div>
        </CardContent>
      </Card>
      
      <ZapDialog
        open={showZapDialog}
        onOpenChange={setShowZapDialog}
        recipientPubkey={DEVELOPER_PUBKEY}
        recipientLnAddress={DEVELOPER_LN_ADDRESS}
        recipientName="Spookstr Developer"
      />
    </>
  );
}