'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Homepage from './components/HomePage';
import Navbar from './components/Navbar';

interface DatasetItem {
  song: string;
  cover: string;
}

const DatasetManager = () => {
  const [data, setData] = useState<DatasetItem[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('Waiting for dataset upload...');
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/get-data');
      const result = await response.json();

      if (result.success && result.dataset && result.dataset.length > 0) {
        setData(result.dataset); 
      } else {
        setData([]);  
        setUploadStatus('No dataset available. Please upload a dataset.');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setUploadStatus('Failed to fetch dataset. Please try again.');
    }
  };

  useEffect(() => {
    fetchData();

    const eventSource = new EventSource('/api/notify-upload');

    eventSource.onmessage = (event) => {
      console.log('Event received:', event.data);

      try {
        const eventData = JSON.parse(event.data);

        // Update status upload
        setUploadStatus(eventData.message); // Show temporary upload status

        if (eventData.status === 'file-uploaded') {
          console.log('File uploaded, refreshing data...');
          fetchData();
        }
      } catch (error) {
        console.error('Error parsing event data:', error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { data, uploadStatus };
};

const SearchParamHandler = ({
  children,
}: {
  children: (params: Record<string, string>) => React.ReactNode;
}) => {
  const searchParams = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());

  return <>{children(params)}</>;
};

export default function Home() {
  const { data, uploadStatus } = DatasetManager();
  const [searchTerm, setSearchTerm] = useState<string>('');

  return (
    <div className="bg-[#003d5b] min-h-[115vh]">
      <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <Suspense fallback={<p>Loading...</p>}>
        <SearchParamHandler>
          {(params) => (
            <Homepage
              data={data}
              searchParams={params}
              searchTerm={searchTerm}
            />
          )}
        </SearchParamHandler>
      </Suspense>
    </div>
  );
}
