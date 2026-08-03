'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bot, Sparkles, FileSearch, Package } from 'lucide-react';
import { toast } from 'sonner';
import { aiApi, customersApi } from '@/services/api.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, Input, Label } from '@/components/ui/Input';

export default function AIPage() {
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [budget, setBudget] = useState('');
  const [purpose, setTravelPurpose] = useState('');
  const [recommendations, setRecommendations] = useState<any>(null);

  const { data: summary, isLoading: summaryLoading, refetch: fetchSummary } = useQuery({
    queryKey: ['ai', 'summary'],
    queryFn: () => aiApi.getBusinessSummary().then((r) => r.data.data.summary),
    enabled: summaryLoaded,
  });

  const recommendMutation = useMutation({
    mutationFn: () => aiApi.getPackageRecommendations({ budget: Number(budget), travelPurpose: purpose }),
    onSuccess: (res) => setRecommendations(res.data.data),
    onError: () => toast.error('Recommendation service unavailable'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        description="AI-powered business intelligence and recommendations"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Business Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              Business Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!summaryLoaded ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Sparkles className="mb-3 h-10 w-10 text-blue-400" />
                <p className="mb-4 text-sm text-gray-500">Generate an AI-powered summary of your business performance</p>
                <Button onClick={() => { setSummaryLoaded(true); fetchSummary(); }}>
                  Generate Summary
                </Button>
              </div>
            ) : summaryLoading ? (
              <div className="flex items-center gap-3 py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <p className="text-sm text-gray-500">Analyzing your business data...</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{summary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Package Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
              Package Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Customer Budget (USD)</Label>
              <Input type="number" placeholder="e.g. 2000" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div>
              <Label>Travel Purpose</Label>
              <Select value={purpose} onChange={(e) => setTravelPurpose(e.target.value)}>
                <option value="">Select purpose</option>
                <option value="tourism">Tourism</option>
                <option value="business">Business</option>
                <option value="hajj_umrah">Hajj / Umrah</option>
                <option value="study">Study Abroad</option>
                <option value="medical">Medical</option>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!budget || !purpose}
              loading={recommendMutation.isPending}
              onClick={() => recommendMutation.mutate()}
            >
              <Sparkles className="h-4 w-4" /> Get Recommendations
            </Button>

            {recommendations && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-gray-500">{recommendations.reasoning}</p>
                {recommendations.recommendations?.map((rec: any, i: number) => (
                  <div key={i} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rec.title}</p>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        {rec.matchScore}% match
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{rec.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-green-500" />
              Document Validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Use AI to validate customer documents. Navigate to a specific document and use the validate action, or check missing documents for a visa application.
            </p>
            <MissingDocChecker />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MissingDocChecker() {
  const [visaType, setVisaType] = useState('');
  const [country, setCountry] = useState('');
  const [uploaded, setUploaded] = useState('');
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: () => aiApi.detectMissingDocuments({
      visaType,
      country,
      uploadedCategories: uploaded.split(',').map((s) => s.trim()).filter(Boolean),
    }),
    onSuccess: (res) => setResult(res.data.data),
    onError: () => toast.error('Service unavailable'),
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Visa Type</Label>
        <Input placeholder="Tourist, Business..." value={visaType} onChange={(e) => setVisaType(e.target.value)} />
      </div>
      <div>
        <Label>Destination Country</Label>
        <Input placeholder="UAE, UK, USA..." value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>
      <div>
        <Label>Uploaded Categories (comma-separated)</Label>
        <Input placeholder="passport, photo, financial" value={uploaded} onChange={(e) => setUploaded(e.target.value)} />
      </div>
      <Button className="w-full" disabled={!visaType || !country} loading={mutation.isPending} onClick={() => mutation.mutate()}>
        Check Missing Documents
      </Button>
      {result && (
        <div className="space-y-2 pt-2">
          {result.missing?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600">Missing (Required)</p>
              <ul className="mt-1 space-y-1">
                {result.missing.map((d: string) => (
                  <li key={d} className="text-xs text-gray-700 dark:text-gray-300">• {d}</li>
                ))}
              </ul>
            </div>
          )}
          {result.optional?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-yellow-600">Optional</p>
              <ul className="mt-1 space-y-1">
                {result.optional.map((d: string) => (
                  <li key={d} className="text-xs text-gray-700 dark:text-gray-300">• {d}</li>
                ))}
              </ul>
            </div>
          )}
          {result.missing?.length === 0 && <p className="text-xs text-green-600">All required documents appear to be uploaded.</p>}
        </div>
      )}
    </div>
  );
}
