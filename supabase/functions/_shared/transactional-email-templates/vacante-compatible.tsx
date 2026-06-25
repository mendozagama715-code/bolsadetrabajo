import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  nombre?: string
  puesto?: string
  empresa?: string
  ubicacion?: string | null
  tipo_contrato?: string | null
  score?: number
  vacante_url?: string
}

const Email = ({
  nombre = 'Egresado',
  puesto = 'Nueva vacante',
  empresa = 'Empresa',
  ubicacion,
  tipo_contrato,
  score = 0,
  vacante_url = 'https://bolsadetrabajo.lovable.app/app/vacantes',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Nueva vacante compatible con tu perfil: {puesto} en {empresa}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>Bolsa de Trabajo UICH</Heading>
        </Section>

        <Section style={card}>
          <Text style={greeting}>Hola {nombre},</Text>
          <Heading as="h2" style={h2}>
            Encontramos una vacante que coincide con tu perfil
          </Heading>

          <Section style={matchBadge}>
            <Text style={matchText}>{score}% de coincidencia con tu CV</Text>
          </Section>

          <Section style={vacanteBox}>
            <Text style={puestoStyle}>{puesto}</Text>
            <Text style={empresaStyle}>{empresa}</Text>
            {(ubicacion || tipo_contrato) && (
              <Text style={metaStyle}>
                {[ubicacion, tipo_contrato].filter(Boolean).join(' · ')}
              </Text>
            )}
          </Section>

          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={vacante_url} style={button}>
              Ver vacante y postularme
            </Button>
          </Section>

          <Text style={muted}>
            Recibes este correo porque tu perfil tiene un alto grado de coincidencia
            con los requisitos de esta vacante. Puedes ajustar tus preferencias de
            notificación desde tu perfil.
          </Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Universidad Intercultural del Estado de Chiapas — Bolsa de Trabajo
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `Nueva vacante compatible: ${d.puesto ?? ''} (${d.score ?? 0}% match)`,
  displayName: 'Vacante compatible',
  previewData: {
    nombre: 'María',
    puesto: 'Desarrollador Full Stack',
    empresa: 'Tech Solutions',
    ubicacion: 'San Cristóbal de las Casas',
    tipo_contrato: 'tiempo_completo',
    score: 82,
    vacante_url: 'https://bolsadetrabajo.lovable.app/app/vacantes',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const header = { textAlign: 'center' as const, paddingBottom: '16px' }
const brand = { color: '#891C2E', fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }
const card = { backgroundColor: '#f7f3ee', borderRadius: '12px', padding: '28px 24px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 4px' }
const h2 = { color: '#222', fontSize: '20px', fontWeight: 700, lineHeight: '1.3', margin: '0 0 16px' }
const matchBadge = { backgroundColor: '#891C2E', borderRadius: '999px', padding: '6px 14px', display: 'inline-block', margin: '4px 0 18px' }
const matchText = { color: '#ffffff', fontSize: '13px', fontWeight: 600, margin: 0 }
const vacanteBox = { backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px 18px', border: '1px solid #E5E5E5' }
const puestoStyle = { fontSize: '17px', fontWeight: 700, color: '#222', margin: '0 0 4px' }
const empresaStyle = { fontSize: '14px', color: '#555', margin: '0 0 6px' }
const metaStyle = { fontSize: '13px', color: '#777', margin: 0 }
const button = { backgroundColor: '#891C2E', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const muted = { fontSize: '12px', color: '#888', lineHeight: '1.5', marginTop: '18px' }
const hr = { borderColor: '#E5E5E5', margin: '24px 0 12px' }
const footer = { fontSize: '11px', color: '#999', textAlign: 'center' as const, margin: 0 }
