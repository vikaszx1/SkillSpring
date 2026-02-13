import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-lg font-bold text-white">
                Skill<span className="text-primary-400">Spring</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed">
              Empowering learners worldwide with quality courses from expert
              instructors.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Learn</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/courses" className="hover:text-white transition-colors">
                  Browse Courses
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Teach</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Become an Instructor
                </Link>
              </li>
              <li>
                <Link href="/instructor" className="hover:text-white transition-colors">
                  Instructor Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="hover:text-white transition-colors cursor-default">
                  About Us
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800 text-center text-sm">
          &copy; {new Date().getFullYear()} SkillSpring. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
