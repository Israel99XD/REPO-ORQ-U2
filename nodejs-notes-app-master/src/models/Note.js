import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: false
    },
    descripcion: {
      type: [String],
      required: false
    },
    receptor: {
      type: String,
      required: false
    },
    date: {
      type: Date,
      default: Date.now
    },
    contrasenaEquipo: {
      type: String,
      required: false
    },
    respaldo: {
      type: String,
      required: false
    },
    passEquipo: {
      type: String,
      required: false
    },
    malEquipo: {
      type: String,
      required: false
    },
    descripcionDanio: {
      type: String,
      required: false
    },
    status: {
      type: String,
      required: false
    },
    nServicio: {
      type: Number,
      required: false
    },
    presupuesto: {
      type: Number,
      default: 0
    },
    nTelefono: {
      type: Number,
      required: false
    },
    email: {
      type: String,
      required: true
    },
    user: {
      type: String,
      required: true,
    },
    necesitaPiezas: {
      type: String,
      required: false
    },
    archivos: [String],
    piezas: {
      type: Array,
      required: false
    },
    transactionDetails: {
      paymentId: {
        type: String,
        required: false
      },
      payerId: {
        type: String,
        required: false
      },
      paymentStatus: {
        type: String,
        required: false
      },
      amount: {
        type: Number,
        required: false
      },
      paymentDate: {
        type: Date,
        required: false
      },
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Note", NoteSchema);
