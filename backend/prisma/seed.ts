import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Permissions
  const permissionsData = [
    { name: 'View Products', code: 'view:products', description: 'Can view inventory and products list' },
    { name: 'Edit Products', code: 'edit:products', description: 'Can add, edit, and update products' },
    { name: 'Delete Products', code: 'delete:products', description: 'Can delete products from inventory' },
    { name: 'View Reports', code: 'view:reports', description: 'Can view business reports and analytics' },
    { name: 'Manage Employees', code: 'manage:employees', description: 'Can perform CRUD on employee users' },
    { name: 'Manage Purchases', code: 'manage:purchases', description: 'Can create and view procurement purchase logs' },
    { name: 'Manage Sales', code: 'manage:sales', description: 'Can process transactions and manage sales logs' },
    { name: 'Manage Branches', code: 'manage:branches', description: 'Can perform CRUD on branch locations' },
    { name: 'Manage Settings', code: 'manage:settings', description: 'Can read and update company-wide configurations' },
  ];

  const permissions: Record<string, any> = {};
  for (const perm of permissionsData) {
    permissions[perm.code] = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }
  console.log('Permissions seeded.');

  // 2. Create Roles
  const rolesData = [
    { name: 'Super Admin', description: 'Full access to all system features' },
    { name: 'Admin', description: 'Administrative access with minor system restriction' },
    { name: 'Manager', description: 'Manage branch-level operations, purchases, and sales' },
    { name: 'Cashier', description: 'Front-end sales transactions and product viewing' },
    { name: 'Warehouse', description: 'Procurement tracking and stock updates' },
    { name: 'HR', description: 'Employee management and recruitment' },
    { name: 'Accountant', description: 'Financial viewings and accounting metrics' },
  ];

  const roles: Record<string, any> = {};
  for (const r of rolesData) {
    roles[r.name] = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
  }
  console.log('Roles seeded.');

  // 3. Connect Permissions to Roles
  const rolePermissionsMap: Record<string, string[]> = {
    'Super Admin': Object.keys(permissions),
    'Admin': [
      'view:products', 'edit:products', 'view:reports',
      'manage:employees', 'manage:purchases', 'manage:sales'
    ],
    'Manager': [
      'view:products', 'edit:products', 'view:reports',
      'manage:purchases', 'manage:sales'
    ],
    'Cashier': [
      'view:products', 'manage:sales'
    ],
    'Warehouse': [
      'view:products', 'edit:products', 'manage:purchases'
    ],
    'HR': [
      'manage:employees'
    ],
    'Accountant': [
      'view:reports'
    ],
  };

  // Clear existing role-permission assignments to avoid duplicate key errors on seed re-run
  await prisma.rolePermission.deleteMany({});

  for (const [roleName, permCodes] of Object.entries(rolePermissionsMap)) {
    const roleId = roles[roleName].id;
    for (const code of permCodes) {
      const permissionId = permissions[code].id;
      await prisma.rolePermission.create({
        data: {
          roleId,
          permissionId,
        },
      });
    }
  }
  console.log('Role permissions assigned.');

  // 4. Create Initial Branch
  const mainBranch = await prisma.branch.upsert({
    where: { code: 'HQ001' },
    update: {},
    create: {
      name: 'Main Headquarters',
      code: 'HQ001',
      address: '123 Enterprise Blvd, Suite 100',
      phone: '+1 (555) 019-2834',
    },
  });
  console.log('Initial branch seeded.');

  // 5. Create Default Company Settings
  const settingsCount = await prisma.companySettings.count();
  if (settingsCount === 0) {
    await prisma.companySettings.create({
      data: {
        companyName: 'Enterprise Solutions Inc.',
        logo: '',
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        taxRate: 8.25,
        receiptFooter: 'Thank you for shopping with us! Please come again.',
      },
    });
    console.log('Default company settings seeded.');
  }

  // 6. Create Super Admin User
  const adminEmail = 'admin@enterprise.com';
  const hashedPassword = await bcrypt.hash('Password123', 10);
  const superAdminRole = roles['Super Admin'];

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      roleId: superAdminRole.id,
      branchId: mainBranch.id,
    },
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      status: 'ACTIVE',
      roleId: superAdminRole.id,
      branchId: mainBranch.id,
    },
  });

  // Assign this Super Admin user as the manager of the initial branch
  await prisma.branch.update({
    where: { id: mainBranch.id },
    data: { managerId: adminUser.id },
  });

  console.log('Super Admin user seeded. Email: admin@enterprise.com, Password: Password123');

  // 7. Seed Categories and Products
  console.log('Seeding categories and products...');
  const categoriesData = ['Beverages', 'Espresso', 'Bakery', 'Sandwiches'];
  const categories: Record<string, any> = {};
  for (const name of categoriesData) {
    categories[name] = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const productsData = [
    { name: 'Vanilla Latte', price: 4.95, cost: 1.25, stock: 120, threshold: 15, category: 'Espresso', sku: 'ESP-LAT-01' },
    { name: 'Chocolate Croissant', price: 3.50, cost: 0.90, stock: 8, threshold: 10, category: 'Bakery', sku: 'BAK-CRO-02', expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }, // Expires in 2 days
    { name: 'Double Espresso Shot', price: 2.75, cost: 0.40, stock: 450, threshold: 50, category: 'Espresso', sku: 'ESP-SHO-03' },
    { name: 'Iced Matcha Tea', price: 4.25, cost: 1.10, stock: 5, threshold: 15, category: 'Beverages', sku: 'BEV-MAT-04' }, // Low stock
    { name: 'Smoked Turkey Club', price: 8.95, cost: 2.75, stock: 40, threshold: 12, category: 'Sandwiches', sku: 'SND-CLB-05' },
    { name: 'Blueberry Muffin', price: 3.25, cost: 0.75, stock: 3, threshold: 8, category: 'Bakery', sku: 'BAK-MUF-06', expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }, // Expired 1 day ago
  ];

  const products: Record<string, any> = {};
  for (const p of productsData) {
    products[p.sku] = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        threshold: p.threshold,
        expiryDate: p.expiryDate || null,
      },
      create: {
        name: p.name,
        sku: p.sku,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        threshold: p.threshold,
        expiryDate: p.expiryDate || null,
        categoryId: categories[p.category].id,
        branchId: mainBranch.id,
      },
    });
  }

  // 8. Seed Customers
  console.log('Seeding customers...');
  const customersData = [
    { name: 'Alice Smith', phone: '+1 (555) 021-3928', email: 'alice@example.com' },
    { name: 'Bob Johnson', phone: '+1 (555) 021-7733', email: 'bob@example.com' },
    { name: 'Charlie Brown', phone: '+1 (555) 021-9988', email: 'charlie@example.com' },
  ];
  const seededCustomers = [];
  for (const c of customersData) {
    const cust = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: c,
    });
    seededCustomers.push(cust);
  }

  // 9. Seed Expenses
  console.log('Seeding expenses...');
  const expensesData = [
    { amount: 1500.00, description: 'HQ Store Monthly Rent', category: 'Rent', offsetDays: 15 },
    { amount: 310.25, description: 'HQ Electricity & Power Bills', category: 'Utilities', offsetDays: 1 },
    { amount: 80.00, description: 'Broadband Fiber Internet', category: 'Utilities', offsetDays: 5 },
    { amount: 450.00, description: 'Espresso Maker Maintenance', category: 'Other', offsetDays: 8 },
    { amount: 1200.00, description: 'Salary for Cashier Staff', category: 'Salaries', offsetDays: 12 },
  ];

  // Clear expenses first to prevent duplicate seeds
  await prisma.expense.deleteMany({});

  for (const exp of expensesData) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() - exp.offsetDays);
    await prisma.expense.create({
      data: {
        amount: exp.amount,
        description: exp.description,
        category: exp.category,
        date: expDate,
        branchId: mainBranch.id,
      },
    });
  }

  // 10. Seed Transactions (Orders) over the last 30 days
  console.log('Seeding transactions...');
  // Clear any existing transaction seeds to prevent unique check violations on invoices
  await prisma.transactionItem.deleteMany({});
  await prisma.transaction.deleteMany({});

  const paymentMethods = ['CASH', 'CARD', 'MOBILE_WALLET'];
  const orderTypes = ['DINE_IN', 'TAKE_AWAY', 'DELIVERY'];

  // Seed data loop for last 30 days
  for (let i = 29; i >= 0; i--) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - i);
    
    // Seed 3-6 transactions per day
    const numTx = Math.floor(Math.random() * 4) + 3; // 3 to 6
    for (let t = 0; t < numTx; t++) {
      const txTime = new Date(targetDate);
      txTime.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));

      const invoiceNumber = `INV-${txTime.getFullYear()}${(txTime.getMonth() + 1).toString().padStart(2, '0')}${txTime.getDate().toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}${t}`;
      
      const pMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const oType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
      const customer = seededCustomers[Math.floor(Math.random() * seededCustomers.length)];

      // Pick 1-3 random items
      const numItems = Math.floor(Math.random() * 3) + 1;
      const orderItems = [];
      let total = 0;
      let cost = 0;

      const skus = Object.keys(products);
      const chosenSkus = new Set<string>();
      while (chosenSkus.size < numItems) {
        chosenSkus.add(skus[Math.floor(Math.random() * skus.length)]);
      }

      for (const sku of chosenSkus) {
        const productObj = products[sku];
        const quantity = Math.floor(Math.random() * 2) + 1; // 1 or 2
        total += productObj.price * quantity;
        cost += productObj.cost * quantity;
        orderItems.push({
          productId: productObj.id,
          quantity,
          price: productObj.price,
          cost: productObj.cost,
        });
      }

      const taxRate = 8.25;
      const tax = parseFloat(((total * taxRate) / 100).toFixed(2));
      const discount = Math.random() > 0.8 ? 5.00 : 0.00; // occasional discount
      const finalTotal = parseFloat((total + tax - discount).toFixed(2));
      const profit = parseFloat((finalTotal - cost - tax).toFixed(2));

      await prisma.transaction.create({
        data: {
          invoiceNumber,
          total: finalTotal,
          cost,
          profit,
          tax,
          discount,
          paymentMethod: pMethod,
          orderType: oType,
          cashierId: adminUser.id,
          branchId: mainBranch.id,
          customerId: customer.id,
          createdAt: txTime,
          items: {
            create: orderItems,
          },
        },
      });
    }
  }

  // 11. Seed Cash Drawer Sessions
  console.log('Seeding cash drawer...');
  await prisma.cashDrawerSession.deleteMany({});
  await prisma.cashDrawerSession.create({
    data: {
      branchId: mainBranch.id,
      cashierId: adminUser.id,
      openingBalance: 150.00,
      closingBalance: null,
      status: 'OPEN',
      createdAt: new Date(),
    },
  });

  // 12. Seed Activity Logs
  console.log('Seeding activity logs...');
  await prisma.activityLog.deleteMany({});
  const activities = [
    { action: 'USER_LOGIN', details: 'Admin logged in from dashboard IP 192.168.1.10' },
    { action: 'UPDATE_SETTINGS', details: 'Company settings updated (Tax set to 8.25%)' },
    { action: 'CREATE_PRODUCT', details: 'Product Vanilla Latte ESP-LAT-01 was created' },
    { action: 'ADD_BRANCH', details: 'Operating branch main headquarters HQ001 configured' },
    { action: 'DRAWER_OPEN', details: 'Cash drawer session started for John Doe at main storefront' },
  ];

  for (const act of activities) {
    await prisma.activityLog.create({
      data: {
        userId: adminUser.id,
        action: act.action,
        details: act.details,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)), // within last 24h
      },
    });
  }

  // 13. Seed Brands and Units
  console.log('Seeding Brands and Units...');
  await prisma.brand.deleteMany({});
  await prisma.unit.deleteMany({});

  const brands = [];
  for (const name of ['Generic', 'Monin', 'Nescafé', 'Anchor']) {
    brands.push(await prisma.brand.create({ data: { name } }));
  }

  const units = [];
  const unitsData = [
    { name: 'Kilogram', shortName: 'kg' },
    { name: 'Gram', shortName: 'g' },
    { name: 'Liter', shortName: 'L' },
    { name: 'Piece', shortName: 'pcs' },
  ];
  for (const u of unitsData) {
    units.push(await prisma.unit.create({ data: u }));
  }

  // Update existing products with brand and unit links
  const vanillaLatte = await prisma.product.findFirst({ where: { name: 'Vanilla Latte' } });
  if (vanillaLatte) {
    const genericBrand = brands.find(b => b.name === 'Generic');
    const pcsUnit = units.find(u => u.shortName === 'pcs');
    await prisma.product.update({
      where: { id: vanillaLatte.id },
      data: {
        brandId: genericBrand?.id,
        unitId: pcsUnit?.id,
      }
    });

    // 14. Seed Product Variants for Vanilla Latte
    console.log('Seeding product variants...');
    await prisma.productVariant.deleteMany({});
    
    const variantLarge = await prisma.productVariant.create({
      data: {
        productId: vanillaLatte.id,
        name: 'Size: Large',
        sku: 'ESP-LAT-01-LG',
        barcode: '123456789012',
        price: 5.95,
        cost: 1.55,
        stock: 50,
        threshold: 10,
      }
    });

    const variantMedium = await prisma.productVariant.create({
      data: {
        productId: vanillaLatte.id,
        name: 'Size: Medium',
        sku: 'ESP-LAT-01-MD',
        barcode: '123456789029',
        price: 4.95,
        cost: 1.25,
        stock: 70,
        threshold: 15,
      }
    });

    // 15. Seed Raw Materials
    console.log('Seeding raw materials...');
    await prisma.rawMaterial.deleteMany({});

    const espressoBeans = await prisma.rawMaterial.create({
      data: {
        name: 'Espresso Beans',
        sku: 'RAW-ESP-01',
        unit: 'kg',
        stock: 15.5,
        cost: 18.0,
      }
    });

    const milk = await prisma.rawMaterial.create({
      data: {
        name: 'Milk',
        sku: 'RAW-MLK-02',
        unit: 'L',
        stock: 48.0,
        cost: 1.5,
      }
    });

    const vanillaSyrup = await prisma.rawMaterial.create({
      data: {
        name: 'Vanilla Syrup',
        sku: 'RAW-VAN-03',
        unit: 'L',
        stock: 12.0,
        cost: 9.5,
      }
    });

    // 16. Seed Recipe for Vanilla Latte Large Variant
    console.log('Seeding recipes...');
    await prisma.recipe.deleteMany({});
    
    await prisma.recipe.create({
      data: {
        productId: vanillaLatte.id,
        variantId: variantLarge.id,
        name: 'Vanilla Latte Large Blend',
        description: 'Standard large vanilla latte mix parameters',
        ingredients: {
          create: [
            { rawMaterialId: espressoBeans.id, quantityUsed: 0.02 },
            { rawMaterialId: milk.id, quantityUsed: 0.30 },
            { rawMaterialId: vanillaSyrup.id, quantityUsed: 0.04 },
          ]
        }
      }
    });

    // 17. Seed Gift Cards
    console.log('Seeding gift cards...');
    await prisma.giftCard.deleteMany({});
    await prisma.giftCard.create({
      data: {
        code: 'GIFT-WELCOME50',
        balance: 50.00,
        isActive: true,
        expiryDate: new Date('2030-12-31')
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
