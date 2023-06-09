import { Appointment, IAppointment } from "./model.js";

// Crear nueva cita
export const createAppointment = async (data, token) => {
  // Validamos que la petición tenga la información necesaria, y el cliente la autorización.
  if (!data || !data.start || !data.end || !data.doctor || !data.client)
    throw new Error("MISSING_DATA");
  if (
    data.doctor !== token.id &&
    data.client !== token.id &&
    token.role !== "ADMIN"
  )
    throw new Error("NOT_AUTHORIZED");
  // Comprobamos que no hay citas para ese doctor en el horario solicitado
  const overlap = await listAppointments(data.start, data.end, data.doctor);
  if (overlap.length) throw new Error("DUPLICATED_DATE");
  return Appointment.create(data);
};

// Sacar lista de citas que incluyen opcionalmente la id del usuario o un intervalo de tiempo
export const listAppointments = async (
  start?: String,
  end?: String,
  token?
) => {
  if (token.role === "ADMIN") {
    return Appointment.find({}).populate("client", ["name"]).populate("doctor");
  }
  const filter: any = { $and: [{ active: true }] };
  if (token.id)
    filter.$and.push({ $or: [{ client: token.id }, { doctor: token.id }] });
  if (start !== "" && end === "") filter.$and.push({ end: { $gte: start } });
  if (end !== "" && start === "") filter.$and.push({ start: [{ $lte: end }] });
  if (start && end)
    filter.$and.push({ end: { $gte: start } }, { start: { $lte: end } });

  return Appointment.find(filter).populate("doctor");
};

// Actualizar cita
export const updateAppointment = async (appID, data, token) => {
  // Comprobamos si la cita a actualizar existe, y validamos la autorización del usuario.
  const appointment = await Appointment.findOne({ _id: appID });
  if (!appointment) throw new Error("NOT_FOUND");
  if (
    (token.id !== appointment.client || token.id !== appointment.doctor) &&
    token.role !== "ADMIN"
  )
    throw new Error("NOT_AUTHORIZED");
  const updatedValues = (({ start, end, doctor }) => ({ start, end, doctor }))(
    data
  );
  const overlap = await listAppointments(data.start, data.end, data.doctor);
  if (overlap.length) throw new Error("DUPLICATED_DATE");
  return Appointment.findOneAndUpdate({ _id: appID }, updatedValues, {
    new: true,
  });
};

// Borrar cita
export const deleteAppointment = async (appID, token) => {
  // Comprobamos que la cita a borrar existe, y el usuario tiene la autorización pertinente
  const appointment = await Appointment.findOne({ id: appID });
  if (!appointment) throw new Error("NOT_FOUND");
  if (token.id !== appointment.client && token.role !== "ADMIN")
    throw new Error("NOT_AUTHORIZED");
  return Appointment.updateOne(appID, { active: false });
};
