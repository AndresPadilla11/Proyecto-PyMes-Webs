/**
 * Script para convertir un usuario a ADMIN
 * Uso: npx tsx scripts/makeAdmin.ts <email>
 * 
 * Ejemplo: npx tsx scripts/makeAdmin.ts usuario@ejemplo.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin(email: string) {
  try {
    console.log(`🔍 Buscando usuario con email: ${email}...`);

    // Buscar el usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true
      }
    });

    if (!user) {
      console.error(`❌ No se encontró ningún usuario con el email: ${email}`);
      process.exit(1);
    }

    if (user.role === 'ADMIN') {
      console.log(`✅ El usuario ${email} ya es ADMIN. No se requiere cambio.`);
      console.log(`   Nombre: ${user.fullName}`);
      console.log(`   Rol actual: ${user.role}`);
      await prisma.$disconnect();
      return;
    }

    console.log(`📋 Usuario encontrado:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Nombre: ${user.fullName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rol actual: ${user.role}`);
    console.log(`   Tenant ID: ${user.tenantId}`);

    // Actualizar el rol a ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    console.log(`\n✅ ¡Usuario actualizado exitosamente!`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Nombre: ${updatedUser.fullName}`);
    console.log(`   Nuevo rol: ${updatedUser.role}`);
    console.log(`\n💡 IMPORTANTE: Debes cerrar sesión y volver a iniciar sesión para que los cambios surtan efecto.`);
    console.log(`   El token JWT actual aún contiene el rol antiguo, así que necesitas un nuevo token.`);

  } catch (error) {
    console.error('❌ Error al actualizar el usuario:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener el email de los argumentos de línea de comandos
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Debes proporcionar el email del usuario');
  console.log('\n📖 Uso:');
  console.log('   npx tsx scripts/makeAdmin.ts <email>');
  console.log('\n📝 Ejemplo:');
  console.log('   npx tsx scripts/makeAdmin.ts usuario@ejemplo.com');
  process.exit(1);
}

// Validar formato de email básico
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error(`❌ Error: "${email}" no es un email válido`);
  process.exit(1);
}

// Ejecutar la función
void makeAdmin(email);

