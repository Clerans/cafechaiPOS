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
