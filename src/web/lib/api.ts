export class ApiError extends Error { constructor(message:string, public readonly ambiguous:boolean, public readonly code?:string){super(message);this.name='ApiError';} }
export interface Health { app:string;version:string;status:string;database:{status:string;schemaVersion:number};startedAt:string }
export interface Backup {id:string;createdAt:string;schemaVersion:number;sizeBytes:number}
const domainMessages:Record<string,string>={CHASSIS_CONFLICT:'Este chassi já está registrado em outra unidade. Confira a identificação antes de salvar.',ORDER_TERMINAL:'Esta OP está encerrada. Consulte sua unidade e histórico.',ALREADY_CONVERTED:'Esta OP já possui unidade. Consulte novamente e use Salvar alterações.',INVALID_RESERVATION:'Esta OP não possui reserva ativa. Consulte o histórico.',INVALID_TRANSITION:'A situação atual não permite esta alteração. Consulte novamente.',BLOCK_RESOLVED:'Este bloqueio já foi resolvido. Consulte a lista novamente.',VALIDATION_ERROR:'Revise os campos e formatos informados.',INVALID_DATE:'Informe uma data válida.',INVALID_QUANTITY:'Informe uma quantidade inteira válida.',REASON_REQUIRED:'Informe o motivo da correção.',INVALID_CODE:'Informe um código ME válido.',INVALID_COLOR:'Informe a cor ou selecione Não aplicável.',REFERENCE_CONFLICT:'A referência já existe ou possui vínculos incompatíveis.',VERSION_CONFLICT:'Este cadastro foi alterado. Feche a edição e consulte novamente.',IDEMPOTENCY_CONFLICT:'Esta operação já foi usada com outros dados. Consulte o histórico antes de iniciar uma nova operação.',INACTIVE_REFERENCE:'O modelo ou a cor está inativo. Selecione uma referência ativa.',INSUFFICIENT_STOCK:'Saldo insuficiente nesta origem. Revise seu histórico antes de corrigir.',ALREADY_REVERSED:'Este movimento já foi estornado.',VARIANT_PRODUCT_CONFLICT:'A cor deve permanecer no modelo de origem.',NOT_FOUND:'Registro não encontrado. Consulte novamente.',DATABASE_BUSY:'Banco ocupado. Tente novamente com esta mesma operação.',MAINTENANCE:'Serviço em manutenção. Tente novamente em instantes.'};
Object.assign(domainMessages, {
 INVALID_TIME:'Informe data e horário válidos, incluindo a data do término.',
 INVALID_INTERVAL:'O término não pode ser anterior ao início. Confira também a data.',
 PAUSE_OUT_OF_BOUNDS:'A pausa deve ficar dentro do período conhecido da própria etapa.',
 PAUSE_OVERLAP:'Há pausas sobrepostas na mesma etapa. Confira os intervalos.',
 STAGE_INCOMPLETE:'Para concluir, informe responsável, início e término e complete as pausas.',
 SELF_CHECK_PENDING:'Revise os 8 itens: não avaliados ou não conformes impedem concluir; não aplicável exige justificativa.',
 OCCURRENCES_PENDING:'Resolva as ocorrências abertas antes de concluir a montagem.',
 STAGE_COMPLETED:'Reabra a etapa concluída com motivo antes de alterar seus dados ou registrar novas pendências.',
 OCCURRENCE_TIME_REQUIRED:'Informe a data e hora da ocorrência antes de salvar.',
 RESOLUTION_REQUIRED:'Descreva a ação realizada para resolver a ocorrência.',
 DESCRIPTION_REQUIRED:'Descreva o problema da ocorrência.',
 ORDER_CANCELLED:'Esta OP foi cancelada. A produção está disponível somente para consulta.',
 UNIT_REQUIRED:'Individualize a unidade na primeira transcrição da OP antes de registrar produção.',
 PERSISTED_ROW_OMITTED:'Um registro salvo não pode ser removido. Preserve as etapas, pausas e ocorrências já registradas.'
});
export async function request<T>(path:string,body?:unknown,method:'POST'|'PUT'='POST'):Promise<T>{
 let headers:Record<string,string>={};if(body!==undefined){const session=await request<{csrfToken:string}>('/session');headers={'Content-Type':'application/json','x-csrf-token':session.csrfToken};}
 let response:Response;try{response=await fetch(`/api/v1${path}`,{credentials:'same-origin',...(body!==undefined?{method,headers,body:JSON.stringify(body)}:{})});}catch{throw new ApiError('O serviço local não respondeu. Verifique se o aplicativo está aberto e tente novamente.',true);}
 if(!response.ok){const messages:Record<string,string>={'/health':'Não foi possível verificar o serviço local.','/session':'Não foi possível iniciar uma sessão local. Tente novamente.','/backups':body===undefined?'Não foi possível consultar as cópias locais.':'Não foi possível criar a cópia. Tente novamente.','/restore':'Não foi possível restaurar a cópia. Seus dados de confirmação foram mantidos para uma nova tentativa.'};if(messages[path])throw new Error(messages[path]);if(path.startsWith('/backups/'))throw new Error('Não foi possível validar a cópia. Tente novamente antes de restaurar.');const data=await response.json().catch(()=>null) as {error?:{code?:string}}|null;throw new ApiError(domainMessages[data?.error?.code??'']??'Não foi possível concluir a operação. Seus dados foram mantidos. Tente novamente.',response.status>=500,data?.error?.code);}return response.json() as Promise<T>;
}
