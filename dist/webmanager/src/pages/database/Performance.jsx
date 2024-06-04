import react, { useLayoutEffect, useEffect, useState, useRef } from "react";
import { Typography } from "@mui/material";
import { getDatabase } from "ivipbase";
import Chart from "chart.js/auto";
import style from "./style.module.scss";

const chartOptions = {
	responsive: true,
	animation: false,
	plugins: {
		legend: {
			labels: {
				color: "#eeeeee",
			},
		},
	},
	scales: {
		x: {
			display: false,
			grid: {
				color: "rgba(250,250,250,.2)",
			},
		},
		y: {
			ticks: {
				color: "#eeeeee",
			},
			grid: {
				color: "rgba(250,250,250,.2)",
			},
			title: {
				display: true,
				text: "Valores",
				color: "#eeeeee",
			},
		},
	},
};

const formatBytes = (bytes) => {
	if (bytes === 0 || !bytes || isNaN(bytes)) return "0 Bytes";
	if (bytes < 0) {
		return `-${formatBytes(Math.abs(bytes))}`;
	}
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const formattedNumber = (bytes / Math.pow(k, i)).toFixed(2); // Limita a 2 casas decimais
	return `${formattedNumber} ${sizes[i] ?? "Bytes"}`;
};

export const Performance = () => {
	const [data, setData] = useState({
		dbname: "",
		version: "",
		time: Date.now(),
		process: -1,
		platform: undefined,
		arch: undefined,
		release: undefined,
		host: undefined,
		uptime: undefined,
		load: [],
		mem: undefined,
		cpus: [],
		network: [],
		data: [],
	});

	const dbRef = useRef(null);
	const cpuRef = useRef(null);
	const memRef = useRef(null);
	const netRef = useRef(null);

	useLayoutEffect(() => {
		const db = getDatabase();

		const getData = () => {
			db.getInfo().then((data) => {
				setData(data);
			});
		};

		const time = setInterval(getData, 20000);
		const time2 = setTimeout(getData, 1000);

		return () => {
			clearInterval(time);
			clearTimeout(time2);
		};
	}, []);

	useEffect(() => {
		if (!dbRef.current) {
			return;
		}

		const options = { ...chartOptions };
		options.scales.y.ticks.callback = (value) => formatBytes(value);
		options.scales.y.suggestedMin = 100;
		options.scales.y.suggestedMax = 0;

		const chart = new Chart(dbRef.current, {
			type: "line",
			data: {
				labels: data.data.map(({ timestamp }) => new Date(timestamp).toLocaleString()),
				datasets: [
					{
						label: "Recebido",
						data: data.data.map(({ stats }) => stats?.request ?? 0),
						fill: false,
						borderColor: "rgba(79,195,247,1)",
						tooltip: {
							callbacks: {
								label: (context) => `${context.dataset.label}: ${formatBytes(context.parsed.y)}`,
							},
						},
					},
					{
						label: "Respondido",
						data: data.data.map(({ stats }) => stats?.response ?? 0),
						fill: false,
						borderColor: "rgba(236,64,122,1)",
						tooltip: {
							callbacks: {
								label: (context) => `${context.dataset.label}: ${formatBytes(context.parsed.y)}`,
							},
						},
					},
				],
			},
			options,
		});

		return () => {
			chart.destroy();
		};
	}, [data, dbRef.current]);

	useEffect(() => {
		if (!cpuRef.current) {
			return;
		}

		const options = { ...chartOptions };
		options.scales.y.ticks.callback = (value) => `${value}%`;
		options.scales.y.suggestedMin = 0;
		options.scales.y.suggestedMax = 100;

		const chart = new Chart(cpuRef.current, {
			type: "line",
			data: {
				labels: data.data.map(({ timestamp }) => new Date(timestamp).toLocaleString()),
				datasets: [
					{
						label: "CPU",
						data: data.data.map(({ cpuUsage }) => cpuUsage),
						fill: false,
						borderColor: "rgba(75, 192, 192, 1)",
						tooltip: {
							callbacks: {
								label: (context) => `${context.dataset.label}: ${context.parsed.y}%`,
							},
						},
					},
				],
			},
			options,
		});

		return () => {
			chart.destroy();
		};
	}, [data, cpuRef.current]);

	useEffect(() => {
		if (!memRef.current) {
			return;
		}

		const options = { ...chartOptions };
		options.scales.y.ticks.callback = (value) => formatBytes(value);
		options.scales.y.suggestedMin = 2;
		options.scales.y.suggestedMax =
			data.data.reduce((actual, current) => {
				return Math.max(actual, current.memoryUsage.total);
			}, 0) ??
			data?.mem?.total ??
			4;

		const chart = new Chart(memRef.current, {
			type: "line",
			data: {
				labels: data.data.map(({ timestamp }) => new Date(timestamp).toLocaleString()),
				datasets: [
					{
						label: "Livre",
						data: data.data.map(({ memoryUsage }) => memoryUsage.free),
						fill: false,
						borderColor: "rgba(102,187,106,1)",
						tooltip: {
							callbacks: {
								label: (context) => `${context.dataset.label}: ${formatBytes(context.parsed.y)}`,
							},
						},
					},
					{
						label: "Usado",
						data: data.data.map(({ memoryUsage }) => memoryUsage.used),
						fill: false,
						borderColor: "rgba(255,193,7,1)",
						tooltip: {
							callbacks: {
								label: (context) => `${context.dataset.label}: ${formatBytes(context.parsed.y)}`,
							},
						},
					},
				],
			},
			options,
		});

		return () => {
			chart.destroy();
		};
	}, [data, memRef.current]);

	useEffect(() => {
		if (!netRef.current) {
			return;
		}

		const options = { ...chartOptions };
		options.scales.y.ticks.callback = (value) => formatBytes(value);
		options.scales.y.suggestedMin = 0;
		options.scales.y.suggestedMax = 0;

		const chart = new Chart(netRef.current, {
			type: "line",
			data: {
				labels: data.data.map(({ timestamp }) => new Date(timestamp).toLocaleString()),
				datasets: [
					{
						label: "Recebido",
						data: data.data.map(({ networkStats }) => networkStats.received),
						fill: false,
						borderColor: "rgba(171,71,188,1)",
						borderDash: [5, 5],
						tooltip: {
							callbacks: {
								label: (context) => `${context.dataset.label}: ${formatBytes(context.parsed.y)}`,
							},
						},
					},
					{
						label: "Transmitido",
						data: data.data.map(({ networkStats }) => networkStats.sent),
						fill: false,
						borderColor: "rgba(77,208,225,1)",
						borderDash: [5, 5],
						tooltip: {
							callbacks: {
								label: (context) => `${context.dataset.label}: ${formatBytes(context.parsed.y)}`,
							},
						},
					},
				],
			},
			options,
		});

		return () => {
			chart.destroy();
		};
	}, [data, netRef.current]);

	return (
		<div className={style["performance"]}>
			<Typography
				variant="h5"
				gutterBottom
			>
				Uso de dados
			</Typography>
			<canvas ref={dbRef} />

			<Typography
				variant="h5"
				gutterBottom
			>
				Uso da CPU (%)
			</Typography>
			<canvas ref={cpuRef} />

			<Typography
				variant="h5"
				gutterBottom
			>
				Uso da Memória
			</Typography>
			<canvas ref={memRef} />

			<Typography
				variant="h5"
				gutterBottom
			>
				Uso da Rede (KB/s)
			</Typography>
			<canvas ref={netRef} />
		</div>
	);
};

export default Performance;
