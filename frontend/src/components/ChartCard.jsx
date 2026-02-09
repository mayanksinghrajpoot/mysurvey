import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    Legend
} from 'recharts';
import { BarChart2, PieChart as PieChartIcon, AlignLeft, Activity, Hash, Maximize2, Minimize2, Calculator } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const ChartCard = ({ title, type, data, color = "#8884d8", index = 0, questionKey, onMetricFetch, selectedMetric, metricValue, isLoading, onDrillDown }) => {

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, delay: index * 0.05, ease: "easeOut" }
        }
    };

    const handleMetricChange = (metric) => {
        if (onMetricFetch) {
            onMetricFetch(questionKey, metric);
        }
    };

    const handleChartClick = (data, index) => {
        console.log("Chart Clicked:", data, "Key:", questionKey); // DEBUG
        // Recharts can pass data directly or nested in payload
        const label = data?.label || data?.payload?.label || data?.name || data?.payload?.name; // Added name check for Pie
        console.log("Resolved Label:", label); // DEBUG

        if (onDrillDown && label) {
            onDrillDown(questionKey, label);
        } else {
            console.warn("Drill-down skipped. Missing handler or label.");
        }
    };

    const currentMetric = selectedMetric || 'DISTRIBUTION';

    // Helper: Render Skeleton
    const renderSkeleton = () => (
        <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-lg animate-pulse">
            <div className="h-8 w-24 bg-slate-200 rounded mb-2"></div>
        </div>
    );

    // Helper: Render Metric Value Display
    const renderMetricValue = () => {
        if (isLoading) return renderSkeleton();

        let displayValue = metricValue;
        if (typeof metricValue === 'number') {
            displayValue = metricValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
        }

        // Enable drill-down for ALL metrics as per user request.
        // - AVG, MIN, MAX: Filter by the specific value.
        // - COUNT, UNIQUE: "Show All" (navigate to responses without specific value filter)
        const canDrillDown = onDrillDown && ['MIN', 'MAX', 'AVG', 'COUNT', 'UNIQUE'].includes(currentMetric);

        const handleClick = () => {
            if (canDrillDown && metricValue !== null) {
                if (['COUNT', 'UNIQUE'].includes(currentMetric)) {
                    onDrillDown(questionKey, null); // Clear filter
                } else {
                    onDrillDown(questionKey, metricValue); // Filter by value
                }
            }
        };

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleClick}
                className={`flex flex-col items-center justify-center h-[300px] bg-gradient-to-br from-slate-50 to-white rounded-xl border border-dotted border-slate-200 relative overflow-hidden ${canDrillDown ? 'cursor-pointer hover:shadow-md hover:border-blue-200 transition-all' : ''}`}
            >
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Activity size={120} />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                    {currentMetric === 'AVG' && <Calculator size={14} />}
                    {currentMetric === 'MIN' && <Minimize2 size={14} />}
                    {currentMetric === 'MAX' && <Maximize2 size={14} />}
                    {currentMetric === 'COUNT' && <Hash size={14} />}
                    {currentMetric === 'UNIQUE' && <Activity size={14} />}
                    {currentMetric === 'DISTRIBUTION' ? 'Overview' : currentMetric}
                </span>
                <span className={`text-6xl font-black tracking-tight ${canDrillDown ? 'text-blue-600' : 'text-slate-800'}`}>
                    {displayValue !== null ? displayValue : '-'}
                </span>
                <span className="text-sm text-slate-500 mt-2 font-medium">
                    {canDrillDown ? 'Click to filter responses' : 'calculated result'}
                </span>
            </motion.div>
        );
    };

    // Helper: Render Controls
    const renderControls = () => {
        if (type === 'area') return null; // Time series doesn't have these metrics yet

        const options = [
            { id: 'DISTRIBUTION', icon: <BarChart2 size={14} />, label: 'Chart' },
            { id: 'COUNT', icon: <Hash size={14} />, label: 'Total' },
        ];

        // Add contextual options
        if (['bar', 'rating', 'text', 'dropdown', 'radiogroup'].includes(type) || (type === 'bar' || type === 'pie')) {
            // Allow most types to try aggregation, logic is handled on backend
            // But UI-wise, visual types:
            options.push({ id: 'AVG', icon: <Calculator size={14} />, label: 'Avg' });
            options.push({ id: 'MIN', icon: <Minimize2 size={14} />, label: 'Min' });
            options.push({ id: 'MAX', icon: <Maximize2 size={14} />, label: 'Max' });
            options.push({ id: 'UNIQUE', icon: <Activity size={14} />, label: 'Unique' });
        } else if (type === 'list') {
            options.push({ id: 'UNIQUE', icon: <Activity size={14} />, label: 'Unique' });
        }

        return (
            <div className="relative">
                <select
                    value={currentMetric}
                    onChange={(e) => handleMetricChange(e.target.value)}
                    className="
                        appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold 
                        rounded-lg py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400
                        cursor-pointer transition-colors hover:bg-white hover:border-slate-300
                    "
                >
                    {options.map(opt => (
                        <option key={opt.id} value={opt.id}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                </div>
            </div>
        );
    };

    const renderChart = () => {
        if (isLoading && currentMetric === 'DISTRIBUTION') return renderSkeleton();

        if (currentMetric !== 'DISTRIBUTION') {
            return renderMetricValue();
        }

        if (!data || data.length === 0) {
            return (
                <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <AlignLeft size={48} className="mb-2 opacity-20" />
                    <p className="text-sm font-medium">No data collection yet</p>
                </div>
            );
        }

        switch (type) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="label"
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc', className: 'cursor-pointer' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px', pointerEvents: 'none' }}
                                wrapperStyle={{ pointerEvents: 'none' }}
                            />
                            <Bar dataKey="count" fill={color} radius={[6, 6, 0, 0]} animationDuration={1000} onClick={handleChartClick}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cursor="pointer" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="label"
                                animationDuration={1000}
                                onClick={handleChartClick}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} cursor="pointer" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px', pointerEvents: 'none' }}
                                wrapperStyle={{ pointerEvents: 'none' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value) => <span className="text-slate-600 text-xs font-medium ml-1">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px', pointerEvents: 'none' }}
                                wrapperStyle={{ pointerEvents: 'none' }}
                            />
                            <Area type="monotone" dataKey="count" stroke={color} strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" animationDuration={1500} onClick={handleChartClick} activeDot={{ r: 6, onClick: handleChartClick }} />
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case 'list':
                return (
                    <div className="h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        <ul className="space-y-2">
                            {data.map((item, idx) => (
                                <motion.li
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + (idx * 0.05) }}
                                    className="p-3 bg-white hover:bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center transition-all group cursor-pointer"
                                    onClick={() => handleChartClick({ label: item.label })}
                                >
                                    <span className="text-slate-700 font-medium text-sm group-hover:text-blue-600 transition-colors">{item.label}</span>
                                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full group-hover:bg-blue-100 group-hover:text-blue-700 transition">
                                        {item.count}
                                    </span>
                                </motion.li>
                            ))}
                        </ul>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 p-6 flex flex-col h-full hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)] transition-shadow duration-300"
        >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        {type === 'bar' && <BarChart2 size={18} />}
                        {type === 'pie' && <PieChartIcon size={18} />}
                        {type === 'list' && <AlignLeft size={18} />}
                        {type === 'area' && <Activity size={18} />}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-800 leading-tight">
                            {title}
                        </h3>
                        {type === 'list' && <p className="text-xs text-slate-400 mt-0.5">Open Ended Responses</p>}
                    </div>
                </div>

                {/* Metric Selector */}
                {renderControls()}
            </div>

            <div className="flex-grow relative select-none cursor-pointer touch-manipulation">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentMetric}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {renderChart()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default ChartCard;
