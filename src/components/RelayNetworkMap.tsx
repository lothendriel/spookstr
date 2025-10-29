import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Zap,
  Users,
  Globe,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import type { RelayNetworkInsights, DiscoveredRelay } from '@/hooks/useRelayDiscovery';
import type { RelayConfig } from '@/contexts/AppContext';

interface RelayNetworkMapProps {
  insights: RelayNetworkInsights;
  onAddRelay: (relay: DiscoveredRelay) => void;
  onRemoveRelay: (url: string) => void;
  className?: string;
}

interface NodePosition {
  x: number;
  y: number;
  radius: number;
}

interface RelayNode extends DiscoveredRelay {
  position: NodePosition;
  isYourRelay: boolean;
}

export function RelayNetworkMap({
  insights,
  onAddRelay,
  onRemoveRelay,
  className
}: RelayNetworkMapProps) {
  const [selectedRelay, setSelectedRelay] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  // Safety check for insights data
  if (!insights || !insights.networkMap) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Relay Network Map
          </CardTitle>
          <CardDescription>
            Loading network data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
              <p className="text-sm text-muted-foreground">
                Analyzing your relay network...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 500;
  const CENTER_X = SVG_WIDTH / 2;
  const CENTER_Y = SVG_HEIGHT / 2;

  // Calculate node positions and create network layout
  const relayNodes = useMemo((): RelayNode[] => {
    const { yourRelays = [], contactRelays = [] } = insights.networkMap || {};
    const nodes: RelayNode[] = [];

    // Your relays - arranged in inner circle
    const yourRelayRadius = 80;
    yourRelays.forEach((relay, index) => {
      const angle = (index / yourRelays.length) * 2 * Math.PI;
      const contactRelay = contactRelays.find(r => r.url === relay.url);

      nodes.push({
        ...relay,
        url: relay.url,
        name: relay.name,
        contactCount: contactRelay?.contactCount || 0,
        contacts: contactRelay?.contacts || [],
        health: contactRelay?.health,
        score: contactRelay?.score || 100, // High score for your relays
        isAlreadyAdded: true,
        suggestedMode: relay.mode,
        benefits: contactRelay?.benefits || { newContactsReached: 0, coverageImprovement: 0, networkOverlap: 0 },
        position: {
          x: CENTER_X + Math.cos(angle) * yourRelayRadius,
          y: CENTER_Y + Math.sin(angle) * yourRelayRadius,
          radius: Math.max(15, Math.min(30, 15 + (contactRelay?.contactCount || 0) * 2)),
        },
        isYourRelay: true,
      });
    });

    // Contact relays - arranged in outer circles by importance
    const availableRelays = contactRelays.filter(r => !r.isAlreadyAdded);
    const highImportance = availableRelays.filter(r => r.score > 40);
    const mediumImportance = availableRelays.filter(r => r.score > 20 && r.score <= 40);
    const lowImportance = availableRelays.filter(r => r.score <= 20);

    // Position high importance relays in middle ring
    const midRadius = 150;
    highImportance.slice(0, 12).forEach((relay, index) => {
      const angle = (index / Math.max(highImportance.length, 1)) * 2 * Math.PI;
      nodes.push({
        ...relay,
        position: {
          x: CENTER_X + Math.cos(angle) * midRadius,
          y: CENTER_Y + Math.sin(angle) * midRadius,
          radius: Math.max(8, Math.min(20, 8 + relay.contactCount)),
        },
        isYourRelay: false,
      });
    });

    // Position medium importance relays in outer ring
    const outerRadius = 220;
    mediumImportance.slice(0, 18).forEach((relay, index) => {
      const angle = (index / Math.max(mediumImportance.length, 1)) * 2 * Math.PI;
      nodes.push({
        ...relay,
        position: {
          x: CENTER_X + Math.cos(angle) * outerRadius,
          y: CENTER_Y + Math.sin(angle) * outerRadius,
          radius: Math.max(6, Math.min(15, 6 + relay.contactCount * 0.5)),
        },
        isYourRelay: false,
      });
    });

    return nodes;
  }, [insights]);

  // Generate connections between nodes
  const connections = useMemo(() => {
    if (!showConnections || !insights?.networkMap) return [];

    const lines = [];
    const yourNodes = relayNodes.filter(n => n.isYourRelay);
    const sharedRelays = insights.networkMap.sharedRelays || [];

    for (const yourNode of yourNodes) {
      for (const otherNode of relayNodes) {
        if (otherNode.isYourRelay || otherNode.contactCount < 2) continue;

        // Calculate shared contacts (simplified)
        const sharedContacts = Math.min(yourNode.contactCount, otherNode.contactCount);
        if (sharedContacts > 0) {
          lines.push({
            from: yourNode.position,
            to: otherNode.position,
            strength: Math.min(sharedContacts / 5, 1), // 0-1 opacity
            isShared: sharedRelays.includes(otherNode.url),
          });
        }
      }
    }

    return lines;
  }, [relayNodes, showConnections, insights]);

  const getNodeColor = (node: RelayNode): string => {
    if (node.isYourRelay) {
      return node.health?.status === 'connected' ? '#10b981' : // emerald-500
             node.health?.status === 'error' ? '#ef4444' : // red-500
             '#6b7280'; // gray-500
    }

    if (node.score > 40) return '#3b82f6'; // blue-500 - high value
    if (node.score > 20) return '#8b5cf6'; // violet-500 - medium value
    return '#6b7280'; // gray-500 - low value
  };

  const getNodeStroke = (node: RelayNode): string => {
    if (selectedRelay === node.url) return '#f59e0b'; // amber-500
    if (node.isYourRelay) return '#065f46'; // emerald-800
    return '#374151'; // gray-700
  };

  const handleNodeClick = (node: RelayNode) => {
    setSelectedRelay(selectedRelay === node.url ? null : node.url);
  };

  const selectedNode = relayNodes.find(n => n.url === selectedRelay);

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Relay Network Map
              </CardTitle>
              <CardDescription>
                Visual representation of your relay network and discovered connections
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConnections(!showConnections)}
              >
                {showConnections ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Connections
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLabels(!showLabels)}
              >
                {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Labels
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-800"></div>
                <span>Your Relays</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>High Value</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                <span>Medium Value</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <span>Low Value</span>
              </div>
            </div>

            {/* SVG Network Visualization */}
            <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <svg
                ref={svgRef}
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                className="w-full h-auto"
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              >
                {/* Background grid */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.3"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Connections */}
                {connections.map((conn, index) => (
                  <line
                    key={index}
                    x1={conn.from.x}
                    y1={conn.from.y}
                    x2={conn.to.x}
                    y2={conn.to.y}
                    stroke={conn.isShared ? '#10b981' : '#6b7280'}
                    strokeWidth={conn.isShared ? 2 : 1}
                    strokeOpacity={conn.strength * 0.6}
                    strokeDasharray={conn.isShared ? '0' : '5,5'}
                  />
                ))}

                {/* Relay nodes */}
                {relayNodes.map((node) => (
                  <g key={node.url}>
                    {/* Node circle */}
                    <circle
                      cx={node.position.x}
                      cy={node.position.y}
                      r={node.position.radius}
                      fill={getNodeColor(node)}
                      stroke={getNodeStroke(node)}
                      strokeWidth={selectedRelay === node.url ? 3 : 2}
                      className="cursor-pointer hover:opacity-80 transition-all"
                      onClick={() => handleNodeClick(node)}
                    />

                    {/* Contact count badge for larger nodes */}
                    {node.contactCount > 0 && node.position.radius > 10 && (
                      <text
                        x={node.position.x}
                        y={node.position.y + 4}
                        textAnchor="middle"
                        className="text-xs font-semibold fill-white pointer-events-none"
                      >
                        {node.contactCount}
                      </text>
                    )}

                    {/* Labels */}
                    {showLabels && node.position.radius > 8 && (
                      <text
                        x={node.position.x}
                        y={node.position.y - node.position.radius - 8}
                        textAnchor="middle"
                        className="text-xs fill-gray-700 dark:fill-gray-300 pointer-events-none"
                      >
                        {node.name || (() => {
                          try {
                            return new URL(node.url).hostname.split('.')[0];
                          } catch {
                            return node.url.replace(/^wss?:\/\//, '').split('.')[0];
                          }
                        })()}
                      </text>
                    )}

                    {/* Health indicator */}
                    {node.health && (
                      <circle
                        cx={node.position.x + node.position.radius - 4}
                        cy={node.position.y - node.position.radius + 4}
                        r="4"
                        fill={
                          node.health.status === 'connected' ? '#10b981' :
                          node.health.status === 'error' ? '#ef4444' :
                          node.health.status === 'connecting' ? '#f59e0b' :
                          '#6b7280'
                        }
                        stroke="white"
                        strokeWidth="1"
                        className="pointer-events-none"
                      />
                    )}
                  </g>
                ))}

                {/* Center label */}
                <text
                  x={CENTER_X}
                  y={CENTER_Y - 5}
                  textAnchor="middle"
                  className="text-lg font-bold fill-gray-800 dark:fill-gray-200 pointer-events-none"
                >
                  You
                </text>
                <text
                  x={CENTER_X}
                  y={CENTER_Y + 15}
                  textAnchor="middle"
                  className="text-sm fill-gray-600 dark:fill-gray-400 pointer-events-none"
                >
                  {insights.networkMap?.yourRelays?.length || 0} relays
                </text>
              </svg>
            </div>

            {/* Selected relay details */}
            {selectedNode && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">
                          {selectedNode.name || (() => {
                            try {
                              return new URL(selectedNode.url).hostname;
                            } catch {
                              return selectedNode.url.replace(/^wss?:\/\//, '');
                            }
                          })()}
                        </h4>
                        <p className="text-sm text-muted-foreground font-mono">
                          {selectedNode.url}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {selectedNode.health && (
                          <Badge variant="outline" className={
                            selectedNode.health.status === 'connected' ? 'bg-green-50 text-green-700 border-green-200' :
                            selectedNode.health.status === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                            selectedNode.health.status === 'connecting' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }>
                            {selectedNode.health.status === 'connected' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {selectedNode.health.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {selectedNode.health.status === 'connecting' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {selectedNode.health.status}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          Contacts
                        </div>
                        <div className="font-semibold">{selectedNode.contactCount}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          Score
                        </div>
                        <div className="font-semibold">{selectedNode.score.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Zap className="h-3 w-3" />
                          Latency
                        </div>
                        <div className="font-semibold">
                          {selectedNode.health?.latency ? `${selectedNode.health.latency}ms` : 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Coverage</div>
                        <div className="font-semibold">
                          +{selectedNode.benefits.coverageImprovement.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {!selectedNode.isYourRelay && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => onAddRelay(selectedNode)}
                          size="sm"
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Relay
                        </Button>
                        <Badge variant="outline" className="px-3 py-1">
                          {selectedNode.suggestedMode}
                        </Badge>
                      </div>
                    )}

                    {selectedNode.isYourRelay && selectedNode.health?.status === 'error' && (
                      <Button
                        onClick={() => onRemoveRelay(selectedNode.url)}
                        variant="destructive"
                        size="sm"
                      >
                        Remove Relay
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}