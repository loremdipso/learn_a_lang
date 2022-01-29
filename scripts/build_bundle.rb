#!/usr/bin/env ruby
require 'erb'

class Bundle
	def initialize()
		@global_css = File.read("global.css")
		@bundle_css = File.read("bundle.css")
		@global_js = File.read("global.js")
	end

	def get_binding
		binding
	end
end

def main()
	Dir.chdir(File.join(__dir__, "..", "docs")) do
		rhtml = ERB.new(File.read("bundled.rhtml"))
		data = BundleData.new
		p rhtml.run(data.get_binding)
	end
end

main()