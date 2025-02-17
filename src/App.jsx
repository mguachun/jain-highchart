import React, { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const API_KEY = import.meta.env.VITE_API_KEY;

console.log(API_KEY);  // For debugging
 
const PROPERTIES = ['open', 'high', 'low', 'close', 'adjClose', 'volume', 'unadjustedVolume', 'change'];

async function getHistoricalData() {
  let data = {};
  let err = null;

  try {
    const params = new URLSearchParams({
      from: '2024-02-03',
      apiKey: API_KEY,
    });

    
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/AAPL?apikey=${API_KEY}`
    );

    data = await response.json();
  } catch (e) {
    err = e;
  }

  return { data, err };
}

function useHistoricalData(ticker, property) {
  const [response, setresponse] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // response statuses
      setError(null);
      setLoading(true);

      // fetch data
      const { data, err } = await getHistoricalData(ticker);

      if (err) setError(err);
      else setresponse(data.historical || []); // Ensure we don't try to map undefined data
      setLoading(false);
    })();
  }, [ticker]);

  // Normalize data for highcharts
  const series = response.map((item) => {
    return [new Date(item.date).getTime(), item[property]]; // Convert date to timestamp
  });

  return { data: series, error, loading };
}

function selectionHandler(event) {
  if (!event.xAxis) return false;

  const min = event.xAxis[0].min;
  const max = event.xAxis[0].max;

  console.log({ min, max });
  return false; // Returning false prevents zoom
}

const App = () => {
  const [property, setProperty] = useState(PROPERTIES[0]);
  const { data, error, loading } = useHistoricalData('AAPL', property);

  if (error) {
    console.error(error);
    return <p>Unable. Check the logs.</p>;
  }

  // Chart options
  const options = {
    rangeSelector: {
      selected: 1,
    },
    title: {
      text: 'AAPL Stock Price',
    },
    chart: {
      zooming: { type: 'x' },
  

      events: {
        selection: selectionHandler,
        load: function () {
          const chart = this;
          const series = chart.series[0];

          let startPoint = null;
          Highcharts.addEvent(chart.container, 'mousedown', (e) => {
            startPoint = series.searchPoint(chart.pointer.normalize(e));
            console.log(startPoint);
          });

          Highcharts.addEvent(chart.container, 'mousemove', (e) => {
            if (!startPoint) return;

            const point = series.searchPoint(chart.pointer.normalize(e));

            if (!point) return;
            this.$$delta = ( ( (point.y - startPoint.y) / startPoint.y ) * 100 ).toFixed(2);

            const firstDate = point.x > startPoint.x ? startPoint.x : point.x;
            const secondDate = point.x < startPoint.x ? startPoint.x : point.x;
        // build string of date range to show in tooltip while dragging
        this.$$dateDelta = `${(new Date(firstDate)).toLocaleDateString()} - ${(new Date(secondDate)).toLocaleDateString()}`
        });

        Highcharts.addEvent(chart.container, 'mouseup', (e) => {
          this.$$dateDelta = null;
          this.$$delta = null;
          startPoint = null;
        });
      },
    },
  },
  tooltip: {
    formatter: function (tooltip) {
      const chart = tooltip.chart;

      if (chart.$$delta !== null && chart.$$delta !== undefined) {
        return `<div>${chart.$$dateDelta}<br /><span>Total: <strong>${chart.$$delta}%</strong></span></div>`;
      }

      return tooltip.defaultFormatter.call(this, tooltip);
    }
  },
    xAxis: {
      type: 'datetime',
    },
    series: [
      {
        name: 'AAPL',
        data: data, // Use the data fetched from the API
        tooltip: {
          valueDecimals: 2,
        },
      },
    ],
  };

  const handlePropertySelect = (ev) => {
    setProperty(ev.target.value);
  };

  // Render loading indicator or the chart
  return (
    <div>
      <select value={property} onChange={handlePropertySelect}>
        {PROPERTIES.map((property, index) => (
          <option key={index} value={property}>
            {property}
          </option>
        ))}
      </select>

      {loading ? (
        <p>Loading chart...</p>
      ) : (
        <HighchartsReact highcharts={Highcharts} options={options} />
      )}
    </div>
  );
};

export default App;
