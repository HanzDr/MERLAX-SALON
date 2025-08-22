import { FaLock } from "react-icons/fa";

const ResetPassword = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-md space-y-6">
        <div className="flex flex-col items-center">
          <FaLock className="text-4xl text-[#FFB030]" />
          <h1 className="text-2xl font-bold text-[#FFB030] mt-2 font-newsreader">
            MERLAX
          </h1>
          <p className="text-gray-600 text-sm mt-1">Reset Password</p>
        </div>

        <form className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              placeholder="e.g. dhoregalado@addu.edu.ph"
              className="w-full border-2 border-gray-300 rounded-l p-2 outline-none focus:border-[#FFB030]"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#FFB030] hover:bg-[#e09d29] p-2 rounded text-white font-medium"
          >
            Send Reset Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
