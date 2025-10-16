/**
 * 🚀 SIMPLE WEB SERVER FOR NAI-DANG.COM
 * Serves all HTML files and handles API routes
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { SwarmManager } from './autonomous-agent-swarm.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002;

// Initialize Agent Swarm
const agentSwarm = new SwarmManager();
agentSwarm.startSwarm();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Routes
app.get('/', async (req, res) => {
    const indexPath = join(__dirname, 'index.html');
    const html = await fs.readFile(indexPath, 'utf-8');
    res.send(html);
});

app.get('/services', async (req, res) => {
    const servicesPath = join(__dirname, 'order-intake-form-NEW.html');
    const html = await fs.readFile(servicesPath, 'utf-8');
    res.send(html);
});

app.get('/commander', async (req, res) => {
    const commanderPath = join(__dirname, 'voice-commander-dashboard.html');
    const html = await fs.readFile(commanderPath, 'utf-8');
    res.send(html);
});

app.get('/admin', async (req, res) => {
    const adminPath = join(__dirname, 'admin-dashboard.html');
    const html = await fs.readFile(adminPath, 'utf-8');
    res.send(html);
});

// Order API
let orders = [];

app.post('/api/orders', (req, res) => {
    const orderData = req.body;
    
    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    // Calculate pricing
    let basePrice = 0;
    switch (orderData.serviceType) {
        case 'content-creation':
            basePrice = (orderData.requirements?.wordCount || 1000) * 0.15;
            break;
        case 'market-report':
            basePrice = 500;
            break;
        case 'automation-proposal':
            basePrice = 800;
            break;
        case 'data-analysis':
            basePrice = 600;
            break;
    }
    
    const rushFee = orderData.urgency === 'rush' ? basePrice * 0.3 : 0;
    const subtotal = basePrice + rushFee;
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    
    const order = {
        id: orderId,
        ...orderData,
        estimatedValue: total,
        status: 'pending',
        createdAt: new Date().toISOString(),
        estimatedDelivery: getEstimatedDelivery(orderData.serviceType, orderData.urgency)
    };
    
    orders.push(order);
    
    console.log(`✅ New Order: ${orderId} - $${total.toFixed(2)}`);
    
    res.status(201).json({
        success: true,
        message: 'Order created successfully',
        ...order
    });
});

app.get('/api/orders', (req, res) => {
    res.json({
        success: true,
        count: orders.length,
        orders
    });
});

app.get('/api/revenue', (req, res) => {
    const totalRevenue = orders.reduce((sum, order) => sum + order.estimatedValue, 0);
    
    res.json({
        success: true,
        data: {
            totalRevenue,
            ordersCompleted: orders.filter(o => o.status === 'completed').length,
            ordersInProgress: orders.filter(o => o.status === 'pending').length,
            orderCount: orders.length,
            averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
            emergencyFundProgress: {
                target: 10000,
                current: totalRevenue,
                percentage: (totalRevenue / 10000) * 100
            }
        },
        timestamp: new Date().toISOString()
    });
});

// Swarm Status API
app.get('/api/swarm-status', (req, res) => {
    res.json({
        success: true,
        data: agentSwarm.getStatus(),
        timestamp: new Date().toISOString()
    });
});

function getEstimatedDelivery(serviceType, urgency) {
    const baseHours = {
        'content-creation': 48,
        'market-report': 72,
        'automation-proposal': 96,
        'data-analysis': 72
    };
    
    const hours = urgency === 'rush' 
        ? baseHours[serviceType] * 0.5 
        : baseHours[serviceType];
    
    const deliveryDate = new Date();
    deliveryDate.setHours(deliveryDate.getHours() + hours);
    
    return deliveryDate.toISOString();
}

app.listen(PORT, () => {
    console.log('');
    console.log('🚀 NAI-DANG.COM SERVER RUNNING!');
    console.log('================================');
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log('');
    console.log('📄 Pages:');
    console.log(`   Homepage: http://localhost:${PORT}/`);
    console.log(`   Services: http://localhost:${PORT}/services`);
    console.log(`   Commander: http://localhost:${PORT}/commander`);
    console.log('');
    console.log('📡 API Endpoints:');
    console.log(`   POST http://localhost:${PORT}/api/orders`);
    console.log(`   GET  http://localhost:${PORT}/api/orders`);
    console.log(`   GET  http://localhost:${PORT}/api/revenue`);
    console.log('');
    console.log('💡 Next: Run Cloudflare Tunnel for public access!');
    console.log('================================');
});
