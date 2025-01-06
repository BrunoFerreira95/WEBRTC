import { login, signup } from './actions'

export default function LoginPage() {
  return (
    <form className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email:</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password:</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-4">
        <button
          type="submit"
          formAction={login}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Log in
        </button>
        <button
          type="submit"
          formAction={signup}
          className="w-full py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Sign up
        </button>
      </div>
    </form>
  )
}
