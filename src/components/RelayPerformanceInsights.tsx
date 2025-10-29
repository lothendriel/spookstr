import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Target,
  Globe,
  Activity,
  Plus,
  Trash2,
  Settings
} from 'lucide-react';
import type { RelayNetworkInsights, DiscoveredRelay } from '@/hooks/useRelayDiscovery';

interface RelayPerformanceInsightsProps {
  insights: RelayNetworkInsights;
  onAddRelay: (relay: DiscoveredRelay) => void;
  onRemoveRelay: (url: string) => void;
  onChangeMode: (url: string, mode: 'read' | 'write' | 'both') => void;
  className?: string;
}

export function RelayPerformanceInsights({
  insights,
  onAddRelay,
  onRemoveRelay,
  onChangeMode,
  className
}: RelayPerformanceInsightsProps) {
  // Safety check for insights data
  if (!insights || !insights.networkMap) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                No performance data available
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'add_relay': return <Plus className="h-4 w-4" />;
      case 'remove_relay': return <Trash2 className="h-4 w-4" />;
      case 'change_mode': return <Settings className="h-4 w-4" />;
      default: return <ArrowRight className="h-4 w-4" />;
    }
  };

  const getActionVariant = (type: string) => {
    switch (type) {
      case 'add_relay': return 'default';
      case 'remove_relay': return 'destructive';
      case 'change_mode': return 'secondary';
      default: return 'outline';
    }
  };

  const handleActionClick = (action: any) => {
    const relay = insights.networkMap?.contactRelays?.find(r => r.url === action.relay);

    switch (action.type) {
      case 'add_relay':
        if (relay) onAddRelay(relay);
        break;
      case 'remove_relay':
        onRemoveRelay(action.relay);
        break;
      case 'change_mode':
        // Extract suggested mode from reason (this would be enhanced in real implementation)
        onChangeMode(action.relay, 'both');
        break;
    }
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCoverageDescription = (percentage: number) => {
    if (percentage >= 90) return 'Excellent coverage';
    if (percentage >= 80) return 'Very good coverage';
    if (percentage >= 60) return 'Good coverage';
    if (percentage >= 40) return 'Fair coverage';
    return 'Limited coverage';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{insights.totalDiscovered}</p>
                <p className="text-sm text-muted-foreground">Relays Discovered</p>
              </div>
              <Globe className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${getCoverageColor(insights.contentCoverage)}`}>
                  {insights.contentCoverage.toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">Content Coverage</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Progress value={insights.contentCoverage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {getCoverageDescription(insights.contentCoverage)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${getCoverageColor(insights.publishingReach)}`}>
                  {insights.publishingReach.toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">Publishing Reach</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-2">
              <Progress value={insights.publishingReach} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Contacts who can see your posts
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{insights.missingContacts}</p>
                <p className="text-sm text-muted-foreground">Missing Contacts</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Contacts without known relays
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Network Performance Status
          </CardTitle>
          <CardDescription>
            Overall health of your relay network configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Coverage Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {insights.contentCoverage >= 80 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <h4 className="font-semibold">Content Discovery</h4>
                  <p className="text-sm text-muted-foreground">
                    You can discover content from {insights.contentCoverage.toFixed(0)}% of your network
                  </p>
                </div>
              </div>
              <Badge variant={insights.contentCoverage >= 80 ? 'default' : 'secondary'}>
                {insights.contentCoverage >= 80 ? 'Excellent' :
                 insights.contentCoverage >= 60 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>

            {/* Reach Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {insights.publishingReach >= 80 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <h4 className="font-semibold">Publishing Reach</h4>
                  <p className="text-sm text-muted-foreground">
                    Your posts can reach {insights.publishingReach.toFixed(0)}% of your network
                  </p>
                </div>
              </div>
              <Badge variant={insights.publishingReach >= 80 ? 'default' : 'secondary'}>
                {insights.publishingReach >= 80 ? 'Excellent' :
                 insights.publishingReach >= 60 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>

            {/* Relay Diversity */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-500" />
                <div>
                  <h4 className="font-semibold">Network Diversity</h4>
                  <p className="text-sm text-muted-foreground">
                    Connected to {insights.networkMap?.yourRelays?.length || 0} relays with {insights.networkMap?.sharedRelays?.length || 0} shared connections
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {(insights.networkMap?.yourRelays?.length || 0) >= 3 ? 'Diverse' : 'Limited'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Actions */}
      {insights.suggestedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Recommended Actions
            </CardTitle>
            <CardDescription>
              Optimize your relay configuration for better performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.suggestedActions.slice(0, 5).map((action, index) => (
                <Alert key={index} className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-start gap-3 flex-1">
                      {getActionIcon(action.type)}
                      <div className="flex-1 min-w-0">
                        <AlertTitle className="text-sm font-semibold">
                          {action.type === 'add_relay' && 'Add Relay'}
                          {action.type === 'remove_relay' && 'Remove Relay'}
                          {action.type === 'change_mode' && 'Change Mode'}
                        </AlertTitle>
                        <AlertDescription className="text-sm">
                          <div className="space-y-1">
                            <p><strong>{new URL(action.relay).hostname}</strong></p>
                            <p>{action.reason}</p>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-xs">
                                {action.impact}
                              </Badge>
                              <span className="text-muted-foreground">
                                {action.contactsAffected} contacts affected
                              </span>
                            </div>
                          </div>
                        </AlertDescription>
                      </div>
                    </div>
                    <Button
                      variant={getActionVariant(action.type) as any}
                      size="sm"
                      onClick={() => handleActionClick(action)}
                      className="ml-4"
                    >
                      {action.type === 'add_relay' && 'Add'}
                      {action.type === 'remove_relay' && 'Remove'}
                      {action.type === 'change_mode' && 'Update'}
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Network Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-green-600">Your Relays</h4>
              <div className="space-y-1">
                {(insights.networkMap?.yourRelays || []).slice(0, 5).map((relay, index) => (
                  <div key={relay.url} className="text-sm font-mono text-muted-foreground">
                    {new URL(relay.url).hostname}
                  </div>
                ))}
                {(insights.networkMap?.yourRelays?.length || 0) > 5 && (
                  <div className="text-xs text-muted-foreground">
                    +{(insights.networkMap?.yourRelays?.length || 0) - 5} more
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-blue-600">Shared Relays</h4>
              <div className="space-y-1">
                {(insights.networkMap?.sharedRelays || []).slice(0, 5).map((url, index) => (
                  <div key={url} className="text-sm font-mono text-muted-foreground">
                    {new URL(url).hostname}
                  </div>
                ))}
                {(insights.networkMap?.sharedRelays?.length || 0) > 5 && (
                  <div className="text-xs text-muted-foreground">
                    +{(insights.networkMap?.sharedRelays?.length || 0) - 5} more
                  </div>
                )}
                {(insights.networkMap?.sharedRelays?.length || 0) === 0 && (
                  <div className="text-sm text-muted-foreground italic">
                    No shared relays found
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-orange-600">Coverage Gaps</h4>
              <div className="space-y-1">
                {(insights.networkMap?.coverageGaps || []).slice(0, 5).map((url, index) => (
                  <div key={url} className="text-sm font-mono text-muted-foreground">
                    {new URL(url).hostname}
                  </div>
                ))}
                {(insights.networkMap?.coverageGaps?.length || 0) > 5 && (
                  <div className="text-xs text-muted-foreground">
                    +{(insights.networkMap?.coverageGaps?.length || 0) - 5} more
                  </div>
                )}
                {(insights.networkMap?.coverageGaps?.length || 0) === 0 && (
                  <div className="text-sm text-muted-foreground italic">
                    No significant gaps detected
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}