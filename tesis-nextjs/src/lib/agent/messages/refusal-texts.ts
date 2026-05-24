// Textos de rechazo para consultas fuera de dominio o intentos de injection.
// Se mantienen en un módulo separado para facilitar actualización de copy
// sin tocar la lógica del nodo.
export const REFUSAL_TEXTS: Record<'off-topic' | 'injection', string> = {
  'off-topic':
    'Solo puedo ayudarte con temas relacionados al riego, sensores de suelo y el cuidado de tus plantas. ¿Hay algo sobre tu cultivo en lo que pueda ayudarte?',
  injection:
    'He detectado un intento de modificar mis instrucciones. Solo puedo ayudarte con consultas sobre riego, sensores y cuidado de plantas.',
}
